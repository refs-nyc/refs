import { StateCreator } from 'zustand'
import { ConversationWithMemberships, ExpandedReaction, ExpandedSave, Message, Reaction, Save } from '../types'
import { pocketbase } from '../pocketbase'
import { ClientResponseError } from 'pocketbase'
import { queryClient } from '@/core/queryClient'
import type { InfiniteData } from '@tanstack/react-query'
import { messagingKeys, type ConversationMessagesPage, type ConversationsPage } from '@/features/queries/messaging'
import { wantToMeetKeys } from '@/features/queries/wantToMeet'
import type { StoreSlices } from './types'
import type { Profile } from '../types'

export const PAGE_SIZE = 10

export type MessageSlice = {
  createConversation: (
    is_direct: boolean,
    creatorId: string,
    otherMemberIds: string[],
    title?: string
  ) => Promise<string>
  getDirectConversations: () => Promise<ConversationWithMemberships[]>
  createMemberships: (userIds: string[], conversationId: string) => Promise<void>

  sendMessage: (
    senderId: string,
    conversationId: string,
    text: string,
    parentMessageId?: string,
    imageUrl?: string
  ) => Promise<void>
  updateLastRead: (conversationId: string, userId: string, lastReadDate?: string) => Promise<void>
  conversationUnreadCounts: Record<string, number>
  setConversationUnreadCount: (conversationId: string, count: number) => void
  incrementConversationUnreadCount: (conversationId: string, amount?: number) => void
  resetConversationUnreadCount: (conversationId: string) => void
  clearConversationUnreadCounts: () => void

  reactions: Record<string, ExpandedReaction[]>
  setReactions: (reactions: ExpandedReaction[]) => void
  addReaction: (reaction: ExpandedReaction) => void
  sendReaction: (senderId: string, messageId: string, emoji: string) => Promise<void>
  deleteReaction: (id: string) => Promise<void>
  removeReaction: (reaction: Reaction) => void

  addSave: (userId: string, profileHint?: Partial<Profile>) => Promise<void>
  removeSave: (id: string) => Promise<void>

  archiveConversation: (userId: string, conversationId: string) => Promise<void>
  unarchiveConversation: (userId: string, conversationId: string) => Promise<void>
  leaveConversation: (conversationId: string, userId: string) => Promise<void>
}

export const createMessageSlice: StateCreator<StoreSlices, [], [], MessageSlice> = (set, get) => ({
  conversationUnreadCounts: {},
  createConversation: async (
    is_direct: boolean,
    creatorId: string,
    otherMemberIds: string[],
    title?: string
  ): Promise<string> => {
    try {
      const newConversation = await pocketbase.collection('conversations').create({
        is_direct,
        title: is_direct ? undefined : title || 'New Group Chat',
      })

      await pocketbase
        .collection('memberships')
        .create({ conversation: newConversation.id, user: creatorId })

      await Promise.all(
        otherMemberIds.map((userId) =>
          pocketbase.collection('memberships').create({ conversation: newConversation.id, user: userId })
        )
      )
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(creatorId) })

      return newConversation.id
    } catch (error) {
      throw new Error()
    }
  },
  getDirectConversations: async () => {
    return await pocketbase.collection<ConversationWithMemberships>('conversations').getFullList({
      filter: `is_direct = true`,
      expand: 'memberships_via_conversation.user',
    })
  },
  async createMemberships(userIds, conversationId): Promise<void> {
    try {
      for (const userId of userIds) {
        await pocketbase
          .collection('memberships')
          .create({ conversation: conversationId, user: userId })
      }

      const currentUserId = pocketbase.authStore.record?.id
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(currentUserId) })
      }
    } catch (error) {
      console.error(error)
    }
  },
  sendMessage: async (senderId, conversationId, text, parentMessageId, imageUrl) => {
    try {
      const message = await pocketbase.collection('messages').create<Message>({
        conversation: conversationId,
        text,
        sender: senderId,
        replying_to: parentMessageId,
        image: imageUrl,
      })

      set((state) => ({
        conversationUnreadCounts: {
          ...state.conversationUnreadCounts,
          [conversationId]: 0,
        },
      }))

      queryClient.setQueryData<InfiniteData<ConversationMessagesPage>>(
        messagingKeys.messages(conversationId),
        (existing) => {
          if (!existing) return existing
          const [firstPage, ...restPages] = existing.pages
          if (!firstPage) {
            return {
              pageParams: existing.pageParams,
              pages: [
                {
                  cursor: undefined,
                  nextCursor: undefined,
                  messages: [message],
                  firstMessageDate: message.created,
                },
                ...restPages,
              ],
            }
          }

          if (firstPage.messages.some((entry) => entry.id === message.id)) {
            return existing
          }

          return {
            ...existing,
            pages: [
              { ...firstPage, messages: [message, ...firstPage.messages] },
              ...restPages,
            ],
          }
        }
      )

      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(senderId) })

      const membership = await pocketbase
        .collection('memberships')
        .getFirstListItem(`conversation = "${conversationId}" && user = "${senderId}"`)
      await pocketbase.collection('memberships').update(membership.id, { last_read: message.created })
    } catch (error) {
      console.error(error)
    }
  },

  updateLastRead: async (conversationId: string, userId: string, lastReadDate?: string) => {
    try {
      const membership = await pocketbase
        .collection('memberships')
        .getFirstListItem(
          pocketbase.filter('conversation = {:cid} && user = {:uid}', {
            cid: conversationId,
            uid: userId,
          })
        )

      if (lastReadDate) {
        await pocketbase.collection('memberships').update(membership.id, { last_read: lastReadDate })
      }

      set((state) => ({
        conversationUnreadCounts: {
          ...state.conversationUnreadCounts,
          [conversationId]: 0,
        },
      }))
    } catch (error) {
      console.warn('updateLastRead failed', { conversationId, userId, error })
    }
  },
  setConversationUnreadCount: (conversationId: string, count: number) => {
    set((state) => ({
      conversationUnreadCounts: { ...state.conversationUnreadCounts, [conversationId]: Math.max(0, count) },
    }))
  },
  incrementConversationUnreadCount: (conversationId: string, amount = 1) => {
    set((state) => {
      const current = state.conversationUnreadCounts[conversationId] || 0
      return {
        conversationUnreadCounts: {
          ...state.conversationUnreadCounts,
          [conversationId]: Math.max(0, current + amount),
        },
      }
    })
  },
  resetConversationUnreadCount: (conversationId: string) => {
    set((state) => ({
      conversationUnreadCounts: { ...state.conversationUnreadCounts, [conversationId]: 0 },
    }))
  },
  clearConversationUnreadCounts: () => {
    set(() => ({ conversationUnreadCounts: {} }))
  },

  reactions: {},
  setReactions: (reactions: ExpandedReaction[]) => {
    const newItems: Record<string, ExpandedReaction[]> = {}
    reactions.forEach((item) => {
      if (newItems[item.message]) {
        newItems[item.message].push(item)
      } else {
        newItems[item.message] = [item]
      }
    })
    set({ reactions: newItems })
  },
  addReaction: (reaction: ExpandedReaction) => {
    set((state) => {
      if (!state.reactions[reaction.message]) {
        return {
          reactions: {
            ...state.reactions,
            [reaction.message]: [reaction],
          },
        }
      }
      return {
        reactions: {
          ...state.reactions,
          [reaction.message]: [...state.reactions[reaction.message], reaction],
        },
      }
    })
  },
  sendReaction: async (senderId, messageId, emoji) => {
    try {
      await pocketbase.collection('reactions').create({
        message: messageId,
        emoji,
        user: senderId,
      })
    } catch (error) {
      console.error(error)
    }
  },
  deleteReaction: async (id: string) => {
    try {
      await pocketbase.collection('reactions').delete(id)
    } catch (error) {
      console.error(error)
    }
  },
  removeReaction: (reaction: Reaction) => {
    try {
      set((state) => {
        const newList = { ...state.reactions }
        newList[reaction.message] = newList[reaction.message].filter((r) => r.id !== reaction.id)

        return {
          reactions: newList,
        }
      })
    } catch (error) {
      console.error(error)
    }
  },
  saves: [],
  addSave: async (userId: string, profileHint?: Partial<Profile>) => {
    const savedBy = pocketbase.authStore.record?.id
    if (!savedBy) {
      console.warn('addSave called without an authenticated user')
      return
    }

    const optimisticId = `optimistic-save-${userId}-${Date.now()}`
    const now = new Date().toISOString()
    const optimisticUser = {
      id: userId,
      firstName: profileHint?.firstName ?? '',
      lastName: profileHint?.lastName ?? '',
      name: profileHint?.name ?? `${profileHint?.firstName ?? ''} ${profileHint?.lastName ?? ''}`.trim(),
      userName: profileHint?.userName ?? '',
      location: profileHint?.location ?? '',
      image: profileHint?.image ?? '',
      avatar_url: profileHint?.avatar_url ?? profileHint?.image ?? '',
    }
    const optimisticSave: ExpandedSave = {
      id: optimisticId,
      collectionId: 'saves',
      collectionName: 'saves',
      created: now,
      updated: now,
      user: userId,
      saved_by: savedBy,
      expand: {
        user: optimisticUser as any,
      },
    } as ExpandedSave

    queryClient.setQueryData<ExpandedSave[]>(wantToMeetKeys.list(savedBy), (previous = []) => {
      if (previous.some((entry) => entry.id === optimisticId || entry.user === userId)) {
        return previous
      }
      return [optimisticSave, ...previous]
    })

    try {
      const created = await pocketbase.collection('saves').create<Save>({ user: userId, saved_by: savedBy })
      const expanded = await pocketbase.collection('saves').getOne<ExpandedSave>(created.id, { expand: 'user' })
      queryClient.setQueryData<ExpandedSave[]>(wantToMeetKeys.list(savedBy), (previous = []) => {
        const filtered = previous.filter((entry) => entry.id !== optimisticId)
        if (filtered.some((entry) => entry.id === expanded.id)) {
          return filtered
        }
        return [expanded, ...filtered]
      })
    } catch (error) {
      queryClient.setQueryData<ExpandedSave[]>(wantToMeetKeys.list(savedBy), (previous = []) =>
        previous.filter((entry) => entry.id !== optimisticId)
      )

      if (error instanceof ClientResponseError) {
        const duplicate = (error.data?.data as any)?.user?.code === 'validation_not_unique'
        if (duplicate) {
          try {
            const existing = await pocketbase
              .collection('saves')
              .getFirstListItem<ExpandedSave>(
                pocketbase.filter('user = {:user} && saved_by = {:savedBy}', { user: userId, savedBy }),
                { expand: 'user' }
              )

            queryClient.setQueryData<ExpandedSave[]>(wantToMeetKeys.list(savedBy), (previous = []) => {
              const filtered = previous.filter((entry) => entry.id !== existing.id)
              return [existing, ...filtered]
            })
            return
          } catch (fetchError) {
            console.error('Failed to hydrate existing save after duplicate response', fetchError)
          }
        }
      }

      console.error('addSave error', error)
      throw error
    }
  },
  removeSave: async (id: string) => {
    const savedBy = pocketbase.authStore.record?.id
    if (!savedBy) {
      console.warn('removeSave called without an authenticated user')
      return
    }

    let removed: ExpandedSave | undefined
    queryClient.setQueryData<ExpandedSave[]>(wantToMeetKeys.list(savedBy), (previous = []) => {
      removed = previous.find((entry) => entry.id === id)
      return previous.filter((entry) => entry.id !== id)
    })

    try {
      await pocketbase.collection('saves').delete(id)
    } catch (error) {
      if (removed) {
        queryClient.setQueryData<ExpandedSave[]>(wantToMeetKeys.list(savedBy), (previous = []) => [removed!, ...previous])
      }
      throw error
    }
  },
  archiveConversation: async (userId: string, conversationId: string) => {
    try {
      const membership = await pocketbase
        .collection('memberships')
        .getFirstListItem(
          pocketbase.filter('conversation = {:cid} && user = {:uid}', {
            cid: conversationId,
            uid: userId,
          })
        )

      await pocketbase.collection('memberships').update(membership.id, { archived: true })
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) })
    } catch (error) {
      console.warn('archiveConversation failed', { conversationId, userId, error })
    }
  },
  unarchiveConversation: async (userId: string, conversationId: string) => {
    try {
      const membership = await pocketbase
        .collection('memberships')
        .getFirstListItem(
          pocketbase.filter('conversation = {:cid} && user = {:uid}', {
            cid: conversationId,
            uid: userId,
          })
        )

      await pocketbase.collection('memberships').update(membership.id, { archived: false })
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) })
    } catch (error) {
      console.warn('unarchiveConversation failed', { conversationId, userId, error })
    }
  },
  leaveConversation: async (conversationId: string, userId: string) => {
    try {
      const memberships = await pocketbase.collection('memberships').getFullList({
        filter: pocketbase.filter('conversation = {:cid} && user = {:uid}', {
          cid: conversationId,
          uid: userId,
        }),
      })

      await Promise.all(
        memberships.map((membership) => pocketbase.collection('memberships').delete(membership.id))
      )

      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(userId) })
      queryClient.removeQueries({ queryKey: messagingKeys.messages(conversationId) })
    } catch (error) {
      console.warn('leaveConversation failed', { conversationId, userId, error })
      throw error
    }
  },
})
