import { pocketbase } from '@/features/pocketbase'
import type {
  ConversationWithMemberships,
  ExpandedMembership,
  Message,
} from '@/features/types'
import type { UsersRecord } from '@/features/pocketbase/pocketbase-types'

const CONVERSATION_PAGE_SIZE = 10
const PREVIEW_CONCURRENCY = 2
export const MESSAGE_PAGE_SIZE = 20

export const messagingKeys = {
  root: ['messaging'] as const,
  conversations: (userId: string) => [...messagingKeys.root, 'conversations', userId] as const,
  conversation: (conversationId: string) => [...messagingKeys.root, 'conversation', conversationId] as const,
  messages: (conversationId: string) => [...messagingKeys.root, 'messages', conversationId] as const,
}

export type ConversationPreviewEntry = {
  conversation: ConversationWithMemberships
  memberships: ExpandedMembership[]
  latestMessage: Message | null
  unreadCount: number
}

export type ConversationsPage = {
  page: number
  entries: ConversationPreviewEntry[]
  nextPage?: number
  hasMore: boolean
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

type CompactOptions = {
  compact?: boolean
}

const compactUser = (user: UsersRecord | undefined) => {
  if (!user) return undefined
  return {
    id: user.id,
    userName: user.userName,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    image: user.image,
    avatar_url: (user as any)?.avatar_url ?? undefined,
  }
}

const compactMembership = (membership: ExpandedMembership): ExpandedMembership => {
  const { expand, ...rest } = membership
  const compact = expand?.user ? { user: compactUser(expand.user) } : undefined
  return {
    ...rest,
    expand: compact,
  }
}

const compactConversation = (conversation: ConversationWithMemberships): ConversationWithMemberships => {
  if (!conversation.expand?.memberships_via_conversation) {
    return { ...conversation }
  }

  return {
    ...conversation,
    expand: {
      memberships_via_conversation: conversation.expand.memberships_via_conversation.map((membership) =>
        compactMembership({
          ...membership,
          conversation: membership.conversation ?? conversation.id,
        })
      ) as ExpandedMembership[],
    },
  }
}

const normalizeMemberships = (
  conversation: ConversationWithMemberships,
  override?: ExpandedMembership,
  options: CompactOptions = {}
): ExpandedMembership[] => {
  const { compact } = options
  const base = (conversation.expand?.memberships_via_conversation || []).map((membership) => {
    const normalized: ExpandedMembership = {
      ...membership,
      conversation: membership.conversation ?? conversation.id,
    }
    return compact ? compactMembership(normalized) : normalized
  }) as ExpandedMembership[]

  if (override) {
    const sanitizedOverride = {
      ...override,
      conversation: override.conversation ?? conversation.id,
    } as ExpandedMembership
    const existingIndex = base.findIndex((item) => item.id === sanitizedOverride.id)
    if (existingIndex >= 0) {
      base[existingIndex] = sanitizedOverride
    } else {
      base.push(sanitizedOverride)
    }
  }

  return base
}

const buildPreview = async (
  conversation: ConversationWithMemberships,
  userId: string,
  membershipOverride?: ExpandedMembership
): Promise<ConversationPreviewEntry> => {
  const memberships = normalizeMemberships(conversation, membershipOverride)
  const ownMembership = memberships.find((membership) => membership.expand?.user?.id === userId)

  let latestMessage: Message | null = null
  let unreadCount = 0

  try {
    const latestResponse = await pocketbase.collection('messages').getList<Message>(1, 1, {
      filter: `conversation = "${conversation.id}"`,
      sort: '-created',
    })

    latestMessage = latestResponse.items?.[0] ?? null
    const totalMessages = latestResponse.totalItems ?? (latestMessage ? 1 : 0)

    const lastRead = ownMembership?.last_read
    if (!lastRead) {
      unreadCount = totalMessages
    } else if (latestMessage?.created && new Date(latestMessage.created) > new Date(lastRead)) {
      const unreadResponse = await pocketbase.collection('messages').getList<Message>(1, 1, {
        filter: `conversation = "${conversation.id}" && created > "${lastRead}"`,
        sort: '-created',
      })
      unreadCount = unreadResponse.totalItems ?? unreadResponse.items.length
    }
  } catch (error) {
    console.warn('Failed to build conversation preview', {
      conversationId: conversation.id,
      error,
    })
  }

  const compactedMemberships = memberships.map(compactMembership)

  return {
    conversation: compactConversation(conversation),
    memberships: compactedMemberships,
    latestMessage,
    unreadCount,
  }
}

export async function fetchConversationsPage(
  userId: string,
  page = 1,
  options?: { hydrate?: boolean }
): Promise<ConversationsPage> {
  const hydrate = options?.hydrate !== false
  const fetchOptions = hydrate
    ? {
        sort: '-created',
        expand: 'memberships_via_conversation.user',
      }
    : {
        sort: '-created',
        fields: 'id,title,is_direct,created,updated',
      }
  const response = await pocketbase
    .collection('conversations')
    .getList<ConversationWithMemberships>(page, CONVERSATION_PAGE_SIZE, fetchOptions as any)

  const items = response.items ?? []
  const entries: ConversationPreviewEntry[] = []

  if (hydrate) {
    for (let index = 0; index < items.length; index += PREVIEW_CONCURRENCY) {
      const slice = items.slice(index, index + PREVIEW_CONCURRENCY)
      const previews = await Promise.all(slice.map((conversation) => buildPreview(conversation, userId)))
      entries.push(...previews)

      if (items.length > PREVIEW_CONCURRENCY) {
        await pause(6)
      }
    }
  } else {
    for (const conversation of items) {
      const compact = compactConversation(conversation)
      entries.push({
        conversation: compact,
        memberships: [],
        latestMessage: null,
        unreadCount: 0,
      })
    }
  }

  return {
    page,
    entries,
    nextPage: response.totalPages && page < response.totalPages ? page + 1 : undefined,
    hasMore: (response.totalPages ?? page) > page,
  }
}

export type ConversationMessagesPage = {
  cursor?: string
  nextCursor?: string
  messages: Message[]
  firstMessageDate?: string
}

export async function fetchConversationMessages(
  conversationId: string,
  cursor?: string
): Promise<ConversationMessagesPage> {
  const filter = cursor
    ? pocketbase.filter('conversation = {:id} && created < {:cursor}', { id: conversationId, cursor })
    : pocketbase.filter('conversation = {:id}', { id: conversationId })

  const response = await pocketbase.collection('messages').getList<Message>(1, MESSAGE_PAGE_SIZE, {
    filter,
    sort: '-created',
  })

  const items = response.items ?? []
  const lastRecord = items[items.length - 1]
  let nextCursor: string | undefined

  if ((response.totalItems ?? items.length) > items.length) {
    nextCursor = lastRecord?.created
  }

  let firstMessageDate: string | undefined

  if (!cursor) {
    if ((response.totalItems ?? items.length) > items.length) {
      const lastPage = Math.max(response.totalPages ?? 1, 1)
      const oldest = await pocketbase.collection('messages').getList<Message>(lastPage, 1, {
        filter: pocketbase.filter('conversation = {:id}', { id: conversationId }),
        sort: 'created',
      })
      firstMessageDate = oldest.items?.[0]?.created
    } else if (items.length) {
      firstMessageDate = items[items.length - 1]?.created
    }
  } else if (items.length) {
    firstMessageDate = items[items.length - 1]?.created
  }

  return {
    cursor,
    nextCursor,
    messages: items,
    firstMessageDate,
  }
}

export async function fetchConversation(conversationId: string) {
  const record = await pocketbase
    .collection('conversations')
    .getOne<ConversationWithMemberships>(conversationId, {
      expand: 'memberships_via_conversation.user',
    })

  const memberships = normalizeMemberships(record)

  return {
    conversation: record,
    memberships,
  }
}

export { buildPreview as buildConversationPreview }
