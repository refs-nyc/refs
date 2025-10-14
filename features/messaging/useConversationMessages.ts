import { useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import {
  messagingKeys,
  fetchConversationMessages,
  type ConversationMessagesPage,
} from '@/features/queries/messaging'
import { QUERY_WINDOWS } from '@/features/queries/queryConfig'
import type { Message } from '@/features/types'

export type ConversationMessagesResult = {
  messages: Message[]
  fetchNextPage: () => Promise<void>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isInitialLoading: boolean
  refetch: () => Promise<void>
}

type UseConversationMessagesOptions = {
  enabled?: boolean
  refetchInterval?: number | false
}

export function useConversationMessages(
  conversationId: string,
  options?: UseConversationMessagesOptions
): ConversationMessagesResult {
  const { enabled = true, refetchInterval } = options ?? {}

  const query = useInfiniteQuery<ConversationMessagesPage>({
    queryKey: messagingKeys.messages(conversationId),
    queryFn: ({ pageParam }) => fetchConversationMessages(conversationId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: QUERY_WINDOWS.messagingThread.staleTime,
    gcTime: QUERY_WINDOWS.messagingThread.gcTime,
    refetchInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!__DEV__ || !query.data) return
    const total = query.data.pages.reduce((accumulator, page) => accumulator + page.messages.length, 0)
    console.log('[boot-trace] messaging.thread:pages', conversationId, {
      pages: query.data.pages.length,
      total,
    })
  }, [conversationId, query.data])

  const messages = useMemo<Message[]>(() => {
    const pages = query.data?.pages
    if (!pages) return []
    return pages.flatMap((page) => page.messages)
  }, [query.data?.pages])

  const fetchNextPage = async () => {
    if (!query.hasNextPage || query.isFetchingNextPage) return
    await query.fetchNextPage()
  }

  const refetch = async () => {
    await query.refetch()
  }

  return {
    messages,
    fetchNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    isInitialLoading: query.isInitialLoading,
    refetch,
  }
}
