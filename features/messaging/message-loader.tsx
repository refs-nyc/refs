import { useEffect } from 'react'

import { queryClient } from '@/core/queryClient'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import type { ConversationWithMemberships, Message, Reaction } from '@/features/types'
import { buildConversationPreview, messagingKeys } from '@/features/queries/messaging'
import { upsertConversationPreview } from '@/features/queries/messaging-cache'
import { useConversationPreviews } from '@/features/messaging/useConversationPreviews'
import { useIsFocused } from '@react-navigation/native'

function useMessagingRealtime(enabled: boolean, userId?: string) {
  useEffect(() => {
    if (!enabled || !userId) return

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    const subscribe = async () => {
      try {
        const sub = await pocketbase.collection('messages').subscribe<Message>('*', async (event) => {
          if (event.action !== 'create') return
          const conversationId = event.record?.conversation
          if (!conversationId) return

          try {
            const conversation = await pocketbase
              .collection('conversations')
              .getOne<ConversationWithMemberships>(conversationId, {
                expand: 'memberships_via_conversation.user',
              })
            const preview = await buildConversationPreview(conversation, userId)
            upsertConversationPreview(userId, preview)
          } catch (error) {
            console.warn('Failed to refresh conversation after message', error)
            queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) })
          }
        })
        if (cancelled) {
          sub?.()
          return
        }
        unsubscribe = sub
      } catch (error) {
        console.warn('[messaging] messages subscription failed', error)
      }
    }

    subscribe()

    return () => {
      cancelled = true
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch {}
      }
    }
  }, [enabled, userId])

  useEffect(() => {
    if (!enabled || !userId) return

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    const subscribe = async () => {
      try {
        const sub = await pocketbase.collection('reactions').subscribe<Reaction>('*', async (event) => {
          if (!event.record?.message) return
          if (event.action !== 'create' && event.action !== 'delete') return

          try {
            const message = await pocketbase.collection('messages').getOne<Message>(event.record.message)
            const conversationId = message.conversation
            if (conversationId) {
              queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversationId) })
              queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) })
            }
          } catch (error) {
            console.error('Failed to hydrate reaction message', error)
          }
        })
        if (cancelled) {
          sub?.()
          return
        }
        unsubscribe = sub
      } catch (error) {
        console.warn('[messaging] reactions subscription failed', error)
      }
    }

    subscribe()

    return () => {
      cancelled = true
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch {}
      }
    }
  }, [enabled, userId])

  useEffect(() => {
    if (!enabled || !userId) return

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    const subscribe = async () => {
      try {
        const sub = await pocketbase.collection('memberships').subscribe('*', async (event) => {
          if (event.action === 'create' || event.action === 'update') {
            queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) })
          }
        })
        if (cancelled) {
          sub?.()
          return
        }
        unsubscribe = sub
      } catch (error) {
        console.warn('[messaging] memberships subscription failed', error)
      }
    }

    subscribe()

    return () => {
      cancelled = true
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch {}
      }
    }
  }, [enabled, userId])
}

export function MessagingObserver() {
  const userId = useAppStore((state) => state.user?.id)
  const enabled = Boolean(userId)

  useConversationPreviews(enabled)
  useMessagingRealtime(enabled, userId)

  return null
}

export function MessagesInit() {
  const userId = useAppStore((state) => state.user?.id)
  const isFocused = useIsFocused()
  useConversationPreviews(Boolean(userId) && isFocused)
  return null
}
