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

export function useConversationPreviews(): ConversationPreviewResult {
  const { user, setConversationUnreadCount, clearConversationUnreadCounts } = useAppStore()
  const userId = user?.id

  const query = useInfiniteQuery<ConversationsPage>({
    queryKey: userId ? messagingKeys.conversations(userId) : ['messaging', 'conversations', 'guest'],
    queryFn: ({ pageParam = 1 }) => fetchConversationsPage(userId!, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextPage : undefined),
    enabled: Boolean(userId),
    staleTime: QUERY_WINDOWS.messagingPreviews.staleTime,
    gcTime: QUERY_WINDOWS.messagingPreviews.gcTime,
    refetchInterval: userId ? 15_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!__DEV__ || !query.data) return
    const total = query.data.pages.reduce((accumulator, page) => accumulator + page.entries.length, 0)
    console.log('[boot-trace] messaging.previews:pages', {
      pages: query.data.pages.length,
      total,
    })
  }, [query.data])

  const previews = useMemo<ConversationPreviewSnapshot[]>(() => {
    const pages = query.data?.pages
    if (!pages) return []

    return pages.flatMap((page) =>
      page.entries.map((entry) => ({
        conversation: entry.conversation as unknown as Conversation,
        memberships: entry.memberships,
        latestMessage: entry.latestMessage,
        unreadCount: entry.unreadCount,
      }))
    )
  }, [query.data?.pages])

  useEffect(() => {
    if (!userId) {
      clearConversationUnreadCounts()
      return
    }

    clearConversationUnreadCounts()

    previews.forEach((entry: ConversationPreviewSnapshot) => {
      setConversationUnreadCount(entry.conversation.id, entry.unreadCount ?? 0)
    })
  }, [clearConversationUnreadCounts, previews, setConversationUnreadCount, userId])

  const fetchNextPage = async () => {
    if (!query.hasNextPage || query.isFetchingNextPage) return
    await query.fetchNextPage()
  }

  const refetch = async () => {
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
