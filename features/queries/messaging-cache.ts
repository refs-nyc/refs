import type { InfiniteData } from '@tanstack/react-query'

import { queryClient } from '@/core/queryClient'
import { useAppStore } from '@/features/stores'

import { messagingKeys, type ConversationPreviewEntry, type ConversationsPage } from './messaging'

const ensurePageParams = (pages: ConversationsPage[], pageParams: unknown[]): unknown[] => {
  if (pageParams.length === pages.length) {
    return pageParams
  }
  const next = [...pageParams]
  while (next.length < pages.length) {
    next.push(pages[next.length]?.page ?? next.length + 1)
  }
  return next
}

export function upsertConversationPreview(userId: string, entry: ConversationPreviewEntry) {
  queryClient.setQueryData<InfiniteData<ConversationsPage>>(
    messagingKeys.conversations(userId),
    (existing) => {
      if (!existing) {
        return {
          pages: [
            {
              page: 1,
              entries: [entry],
              hasMore: false,
              nextPage: undefined,
            },
          ],
          pageParams: [1],
        }
      }

      const pages = existing.pages.map((page) => {
        const existingIndex = page.entries.findIndex((candidate) => candidate.conversation.id === entry.conversation.id)
        if (existingIndex === -1) {
          return {
            ...page,
            entries: page.page === existing.pages[0].page
              ? [entry, ...page.entries]
              : page.entries,
          }
        }

        const nextEntries = [...page.entries]
        nextEntries[existingIndex] = entry
        return { ...page, entries: nextEntries }
      })

      const existsInPages = pages.some((page) => page.entries.some((candidate) => candidate.conversation.id === entry.conversation.id))

      if (!existsInPages && pages.length) {
        pages[0] = {
          ...pages[0],
          entries: [entry, ...pages[0].entries],
        }
      }

      return {
        pages,
        pageParams: ensurePageParams(pages, existing.pageParams ?? []),
      }
    }
  )
}

export function patchConversationPreview(
  userId: string,
  conversationId: string,
  updater: (entry: ConversationPreviewEntry | undefined) => ConversationPreviewEntry | undefined
) {
  const { setConversationUnreadCount, resetConversationUnreadCount } = useAppStore.getState()

  queryClient.setQueryData<InfiniteData<ConversationsPage>>(
    messagingKeys.conversations(userId),
    (existing) => {
      if (!existing) return existing

      let updated = false
      let resultingEntry: ConversationPreviewEntry | undefined

      const pages = existing.pages.map((page) => {
        const index = page.entries.findIndex((candidate) => candidate.conversation.id === conversationId)
        if (index === -1) return page

        const current = page.entries[index]
        const nextEntry = updater(current)

        if (!nextEntry) {
          const filtered = page.entries.filter((candidate) => candidate.conversation.id !== conversationId)
          updated = true
          return { ...page, entries: filtered }
        }

        const nextEntries = [...page.entries]
        nextEntries[index] = nextEntry
        updated = true
        resultingEntry = nextEntry
        return { ...page, entries: nextEntries }
      })

      if (!updated) {
        return existing
      }

      if (!resultingEntry) {
        resetConversationUnreadCount(conversationId)
      } else {
        setConversationUnreadCount(conversationId, resultingEntry.unreadCount ?? 0)
      }

      return {
        pages,
        pageParams: ensurePageParams(pages, existing.pageParams ?? []),
      }
    }
  )
}

export function removeConversationPreview(userId: string, conversationId: string) {
  patchConversationPreview(userId, conversationId, () => undefined)
}
