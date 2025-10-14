import { pocketbase } from '@/features/pocketbase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/features/supabase/client'
import type { ConversationWithMemberships, Message } from '@/features/types'
import { ClientResponseError } from 'pocketbase'
import { queryClient } from '@/core/queryClient'
import { messagingKeys, buildConversationPreview } from '@/features/queries/messaging'
import { patchConversationPreview, upsertConversationPreview, removeConversationPreview } from '@/features/queries/messaging-cache'

type InterestMeta = {
  community?: string
  kind?: string
  communityChatId?: string
  [key: string]: any
}

const COMMUNITY_KEY = 'edge-patagonia'

const parseMeta = (metaRaw: any): InterestMeta => {
  if (typeof metaRaw === 'string' && metaRaw.trim()) {
    try {
      return JSON.parse(metaRaw)
    } catch (error) {
      console.warn('Failed to parse interest meta', error)
    }
  }
  if (metaRaw && typeof metaRaw === 'object') {
    return { ...metaRaw }
  }
  return {}
}

const serializeMeta = (meta: InterestMeta) => JSON.stringify(meta)

export const ensureCommunityChat = async (
  refId: string,
  options?: { title?: string }
): Promise<{ conversationId: string; meta: InterestMeta }> => {
  const ref = await pocketbase.collection('refs').getOne(refId)
  const meta = parseMeta(ref.meta)
  if (meta.communityChatId) {
    return { conversationId: meta.communityChatId, meta }
  }

  const title = options?.title || ref.title || 'Interest chat'
  const creatorId = ref.creator

  const conversation = await pocketbase.collection('conversations').create({
    is_direct: false,
    title,
  })

  if (creatorId) {
    await pocketbase.collection('memberships').create({ conversation: conversation.id, user: creatorId }).catch(() => {})
  }

  const updatedMeta: InterestMeta = { ...meta, community: COMMUNITY_KEY, communityChatId: conversation.id }

  try {
    await pocketbase.collection('refs').update(refId, { meta: serializeMeta(updatedMeta) })
  } catch (error) {
    console.warn('Failed to store communityChatId; cleaning up conversation', error)
    try { await pocketbase.collection('conversations').delete(conversation.id) } catch {}
    throw error
  }

  return { conversationId: conversation.id, meta: updatedMeta }
}

const isDuplicateMembershipError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const candidate = error as Partial<ClientResponseError> & {
    response?: { data?: Record<string, any> }
  }

  const data = candidate.data ?? candidate.response?.data
  if (!data || typeof data !== 'object') return false

  return Object.values(data).some((field: any) => {
    if (!field || typeof field !== 'object') return false
    const code = field.code
    if (typeof code === 'string' && code.includes('not_unique')) {
      return true
    }
    const message = field.message
    if (typeof message === 'string') {
      return message.toLowerCase().includes('unique')
    }
    return false
  })
}

export const joinCommunityChat = async (conversationId: string, userId: string): Promise<void> => {
  let alreadyMember = false
  try {
    const existing = await pocketbase.collection('memberships').getList(1, 1, {
      filter: pocketbase.filter('conversation = {:cid} && user = {:uid}', { cid: conversationId, uid: userId }),
    })
    alreadyMember = (existing?.items?.length ?? 0) > 0
  } catch {}

  if (!alreadyMember) {
    try {
      await pocketbase.collection('memberships').create({ conversation: conversationId, user: userId })
    } catch (error) {
      if (isDuplicateMembershipError(error)) {
        alreadyMember = true
      } else if (error instanceof ClientResponseError && error.status === 400) {
        try {
          const confirm = await pocketbase.collection('memberships').getList(1, 1, {
            filter: pocketbase.filter('conversation = {:cid} && user = {:uid}', {
              cid: conversationId,
              uid: userId,
            }),
          })
          if ((confirm?.items?.length ?? 0) > 0) {
            alreadyMember = true
          } else {
            throw error
          }
        } catch (innerError) {
          if (innerError === error) throw error
          throw innerError
        }
      } else {
        throw error
      }
    }
  }
  const previewEntry = await refreshConversation(conversationId)

  // Format timestamp to match PocketBase's format: 'yyyy-MM-dd HH:mm:ss.SSSZ'
  // Example: '2025-10-08T01:11:00.000Z' -> '2025-10-08 01:11:00.000Z'
  const now = new Date()
  const isoString = now.toISOString()
  const pbTimestamp = isoString.replace('T', ' ')
  
  const preview: Message = {
    id: `preview-${conversationId}`,
    conversation: conversationId,
    sender: userId,
    text: 'started a chat',
    created: pbTimestamp,
  }

  patchConversationPreview(userId, conversationId, (entry) => {
    const base = entry ?? previewEntry
    if (!base) return entry
    return {
      ...base,
      latestMessage: preview,
      unreadCount: 0,
    }
  })

  queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) })
}

export const leaveCommunityChat = async (conversationId: string, userId: string) => {
  try {
    const memberships = await pocketbase.collection('memberships').getFullList({
      filter: pocketbase.filter('conversation = {:cid} && user = {:uid}', { cid: conversationId, uid: userId }),
    })
    for (const membership of memberships) {
      await pocketbase.collection('memberships').delete(membership.id)
    }
  } catch (error) {
    console.warn('Failed to leave community chat', error)
  }
  removeConversationPreview(userId, conversationId)
  queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) })
}

const findInterestByChatId = async (conversationId: string) => {
  try {
    const ref = await pocketbase.collection('refs').getFirstListItem(
      pocketbase.filter('meta ~ {:chat}', { chat: conversationId })
    )
    return ref
  } catch (error) {
    console.warn('No interest ref found for chat', conversationId, error)
    return null
  }
}

export const leaveCommunityChatAndUnsubscribe = async (conversationId: string, userId: string) => {
  const ref = await findInterestByChatId(conversationId)
  await leaveCommunityChat(conversationId, userId)

  if (ref?.id) {
    const key = `community_subs:${userId}:${COMMUNITY_KEY}`

    try {
      const raw = await AsyncStorage.getItem(key)
      if (raw) {
        const existing = JSON.parse(raw) as string[]
        const next = existing.filter((id) => id !== ref.id)
        await AsyncStorage.setItem(key, JSON.stringify(next))
      }
    } catch (error) {
      console.warn('Failed to update cached community subscriptions', error)
    }

    try {
      const sb: any = supabase.client
      if (sb) {
        await sb
          .from('community_subscriptions')
          .delete()
          .match({ user_id: userId, ref_id: ref.id })
      }
    } catch (error) {
      console.warn('Failed to remove community subscription in Supabase', error)
    }
  }

  return { refId: ref?.id ?? null, title: ref?.title ?? null }
}

const refreshConversation = async (conversationId: string) => {
  const authUserId = pocketbase.authStore.record?.id
  if (!authUserId) return null

  try {
    const conversation = await pocketbase
      .collection('conversations')
      .getOne<ConversationWithMemberships>(conversationId, {
        expand: 'memberships_via_conversation.user',
      })

    const preview = await buildConversationPreview(conversation, authUserId)
    upsertConversationPreview(authUserId, preview)
    return preview
  } catch (error) {
    console.warn('Failed to refresh conversation after membership change', error)
    queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(authUserId) })
    return null
  }
}
