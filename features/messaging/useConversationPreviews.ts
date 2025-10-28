import { useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import {
  messagingKeys,
  fetchConversationsPage,
  type ConversationsPage,
} from '@/features/queries/messaging'
import { QUERY_WINDOWS } from '@/features/queries/queryConfig'
import { useAppStore } from '@/features/stores'
import type { Conversation, ExpandedMembership, Message } from '@/features/types'

export type ConversationPreviewSnapshot = {
  conversation: Conversation
  memberships: ExpandedMembership[]
  latestMessage: Message | null
  unreadCount: number
}

export type ConversationPreviewResult = {
  previews: ConversationPreviewSnapshot[]
  fetchNextPage: () => Promise<void>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isInitialLoading: boolean
  refetch: () => Promise<void>
}

export function useConversationPreviews(enabled = true): ConversationPreviewResult {
  const { user, setConversationUnreadCount, clearConversationUnreadCounts } = useAppStore()
  const blockedUsers = useAppStore((state) => state.blockedUsers)
  const userId = user?.id

  const query = useInfiniteQuery<ConversationsPage>({
    queryKey: userId ? messagingKeys.conversations(userId) : ['messaging', 'conversations', 'guest'],
    queryFn: ({ pageParam = 1 }) => fetchConversationsPage(userId!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextPage : undefined),
    enabled: Boolean(userId) && enabled,
    staleTime: QUERY_WINDOWS.messagingPreviews.staleTime,
    gcTime: QUERY_WINDOWS.messagingPreviews.gcTime,
    refetchInterval: userId && enabled ? 15_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!enabled) return
    if (!__DEV__ || !query.data) return
    const total = query.data.pages.reduce((accumulator, page) => accumulator + page.entries.length, 0)
    console.log('[boot-trace] messaging.previews:pages', {
      pages: query.data.pages.length,
      total,
    })
  }, [enabled, query.data])

  const parseTimestamp = (value?: string | null): number => {
    if (!value) return 0
    const normalized = value.includes('T') ? value : value.replace(' ', 'T')
    const time = Date.parse(normalized)
    return Number.isNaN(time) ? 0 : time
  }

  const previews = useMemo<ConversationPreviewSnapshot[]>(() => {
    const pages = query.data?.pages
    if (!pages) return []

    const flattened = pages.flatMap((page) =>
      page.entries.map((entry) => ({
        conversation: entry.conversation as unknown as Conversation,
        memberships: entry.memberships,
        latestMessage: entry.latestMessage,
        unreadCount: entry.unreadCount,
      }))
    )

    const filtered = flattened.filter((preview) => {
      if (!userId) return true
      const isDirect = Boolean((preview.conversation as Conversation | undefined)?.is_direct)
      if (!isDirect) return true
      const otherMemberId = preview.memberships
        .map((membership) => membership.expand?.user?.id)
        .find((memberId) => memberId && memberId !== userId)
      if (!otherMemberId) return true
      return !blockedUsers[otherMemberId]
    })

    if (filtered.length <= 1) {
      return filtered
    }

    return filtered.sort((a, b) => {
      const aTime =
        parseTimestamp(a.latestMessage?.created) ||
        parseTimestamp((a.conversation as any)?.updated) ||
        parseTimestamp((a.conversation as any)?.created)
      const bTime =
        parseTimestamp(b.latestMessage?.created) ||
        parseTimestamp((b.conversation as any)?.updated) ||
        parseTimestamp((b.conversation as any)?.created)
      return bTime - aTime
    })
  }, [blockedUsers, query.data?.pages, userId])

  useEffect(() => {
    if (!enabled) return
    if (!userId) {
      clearConversationUnreadCounts()
      return
    }

    clearConversationUnreadCounts()

    previews.forEach((entry: ConversationPreviewSnapshot) => {
      setConversationUnreadCount(entry.conversation.id, entry.unreadCount ?? 0)
    })
  }, [clearConversationUnreadCounts, enabled, previews, setConversationUnreadCount, userId])

  const fetchNextPage = async () => {
    if (!enabled) return
    if (!query.hasNextPage || query.isFetchingNextPage) return
    await query.fetchNextPage()
  }

  const refetch = async () => {
    if (!enabled) return
    await query.refetch()
  }

  return {
    previews,
    fetchNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    isInitialLoading: query.isInitialLoading,
    refetch,
  }
}
