import { StateCreator } from 'zustand'
import {
  Conversation,
  ConversationWithMemberships,
  ExpandedMembership,
  ExpandedReaction,
  ExpandedSave,
  Message,
  Reaction,
  Save,
} from '../types'
import { pocketbase } from '../pocketbase'
import { ClientResponseError } from 'pocketbase'
import { simpleCache } from '@/features/cache/simpleCache'
import type { StoreSlices } from './types'

export const PAGE_SIZE = 10

export type MessageSlice = {
  conversations: Record<string, Conversation>
  setConversations: (conversations: Conversation[]) => void
  updateConversation: (conversation: Conversation) => void
  createConversation: (
    is_direct: boolean,
    creatorId: string,
    otherMemberIds: string[],
    title?: string
  ) => Promise<string>
  addConversation(conversation: Conversation): void
  getDirectConversations: () => Promise<ConversationWithMemberships[]>

  memberships: Record<string, ExpandedMembership[]>
  setMemberships: (memberships: ExpandedMembership[]) => void
  addMembership: (membership: ExpandedMembership) => void
  updateMembership: (membership: ExpandedMembership) => void
  createMemberships: (userIds: string[], conversationId: string) => Promise<void>

  sendMessage: (
    senderId: string,
    conversationId: string,
    text: string,
    parentMessageId?: string,
    imageUrl?: string
  ) => Promise<void>
  messagesPerConversation: Record<string, Message[]>
  setMessagesForConversation: (conversationId: string, messages: Message[]) => void
  setConversationPreview: (conversationId: string, message: Message | null, unreadCount: number) => void
  setConversationPreviews: (
    entries: Array<{ conversationId: string; message: Message | null; unreadCount: number }>
  ) => void
  oldestLoadedMessageDate: Record<string, string>
  setOldestLoadedMessageDate: (conversationId: string, dateString: string) => void
  addOlderMessages: (conversationId: string, messages: Message[]) => void
  addNewMessage: (conversationId: string, message: Message) => void
  firstMessageDate: Record<string, string>
  setFirstMessageDate: (conversationId: string, dateString: string) => void
  updateLastRead: (conversationId: string, userId: string) => Promise<void>
  getNewMessages: (conversationId: string, oldestLoadedMessageDate: string) => Promise<Message[]>
  conversationHydration: Record<string, 'preview' | 'hydrated'>
  conversationLoading: Record<string, boolean>
  loadConversationMessages: (conversationId: string, options?: { force?: boolean }) => Promise<void>
  conversationUnreadCounts: Record<string, number>
  setConversationUnreadCount: (conversationId: string, count: number) => void
  incrementConversationUnreadCount: (conversationId: string, amount?: number) => void
  resetConversationUnreadCount: (conversationId: string) => void

  reactions: Record<string, ExpandedReaction[]>
  setReactions: (reactions: ExpandedReaction[]) => void
  addReaction: (reaction: ExpandedReaction) => void
  sendReaction: (senderId: string, messageId: string, emoji: string) => Promise<void>
  deleteReaction: (id: string) => Promise<void>
  removeReaction: (reaction: Reaction) => void

  saves: ExpandedSave[]
  setSaves: (saves: ExpandedSave[]) => void
  addSave: (userId: string) => Promise<void>
  removeSave: (id: string) => Promise<void>
  savesHydrated: boolean
  ensureSavesLoaded: () => Promise<void>

  archiveConversation: (userId: string, conversationId: string) => Promise<void>
  unarchiveConversation: (userId: string, conversationId: string) => Promise<void>
  leaveConversation: (conversationId: string, userId: string) => Promise<void>
}

export const createMessageSlice: StateCreator<StoreSlices, [], [], MessageSlice> = (set, get) => ({
  conversations: {},
  conversationHydration: {},
  conversationLoading: {},
  conversationUnreadCounts: {},
  setConversations: (items: Conversation[]) => {
    const newItems: Record<string, Conversation> = {}
    items.forEach((item) => {
      newItems[item.id] = item
    })

    set({ conversations: newItems })
  },
  updateConversation: (conversation) => {
    set((state) => ({
      conversations: { ...state.conversations, [conversation.id]: conversation },
    }))
  },
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

      for (const userId of otherMemberIds) {
        await pocketbase
          .collection('memberships')
          .create({ conversation: newConversation.id, user: userId })
      }

      const newMemberships = await pocketbase
        .collection('memberships')
        .getFullList<ExpandedMembership>({
          filter: `conversation = "${newConversation.id}"`,
          expand: 'user',
        })

      set((state) => ({
        conversations: { ...state.conversations, [newConversation.id]: newConversation },
        memberships: { ...state.memberships, [newConversation.id]: newMemberships },
      }))

      return newConversation.id
    } catch (error) {
      throw new Error()
    }
  },
  addConversation: (conversation) => {
    set((state) => ({
      conversations: { ...state.conversations, [conversation.id]: conversation },
    }))
  },
  getDirectConversations: async () => {
    return await pocketbase.collection<ConversationWithMemberships>('conversations').getFullList({
      filter: `is_direct = true`,
      expand: 'memberships_via_conversation.user',
    })
  },
  memberships: {},
  addMembership: (membership) => {
    set((state) => {
      const prev = state.memberships[membership.conversation] || []
      return {
        memberships: {
          ...state.memberships,
          [membership.conversation]: [...prev, membership],
        },
      }
    })
  },
  updateMembership: (membership) => {
    set((state) => {
      const prev = state.memberships[membership.conversation] || []
      return {
        memberships: {
          ...state.memberships,
          [membership.conversation]: prev.map((m) => (m.id === membership.id ? membership : m)),
        },
      }
    })
  },
  async createMemberships(userIds, conversationId): Promise<void> {
    try {
      for (const userId of userIds) {
        await pocketbase
          .collection('memberships')
          .create({ conversation: conversationId, user: userId })
      }

      const newMemberships = await pocketbase
        .collection('memberships')
        .getFullList<ExpandedMembership>({
          filter: `conversation = "${conversationId}"`,
          expand: 'user',
        })

      set((state) => ({
        memberships: { ...state.memberships, [conversationId]: newMemberships },
      }))
    } catch (error) {
      console.error(error)
    }
  },
  setMemberships: (memberships) => {
    const newItems: Record<string, ExpandedMembership[]> = {}
    memberships.forEach((item) => {
      if (newItems[item.conversation]) {
        newItems[item.conversation].push(item)
      } else {
        newItems[item.conversation] = [item]
      }
    })

    set({ memberships: newItems })
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

      set((state) => {
        const current = state.messagesPerConversation[conversationId] || []
        const alreadyExists = current.some((m) => m.id === message.id)
        const nextMessages = alreadyExists ? current : [message, ...current]

        return {
          messagesPerConversation: {
            ...state.messagesPerConversation,
            [conversationId]: nextMessages,
          },
          conversationHydration: {
            ...state.conversationHydration,
            [conversationId]: nextMessages.length > 1 ? 'hydrated' : (state.conversationHydration[conversationId] ?? 'preview'),
          },
          conversationUnreadCounts: {
            ...state.conversationUnreadCounts,
            [conversationId]: 0,
          },
        }
      })

      const membership = await pocketbase
        .collection('memberships')
        .getFirstListItem(`conversation = "${conversationId}" && user = "${senderId}"`)
      await pocketbase
        .collection('memberships')
        .update(membership.id, { last_read: message.created })
    } catch (error) {
      console.error(error)
    }
  },

  messagesPerConversation: {},
  oldestLoadedMessageDate: {},
  firstMessageDate: {},
  setMessagesForConversation: (conversationId: string, messages: Message[]) => {
    set((state) => ({
      messagesPerConversation: { ...state.messagesPerConversation, [conversationId]: messages },
      conversationHydration: { ...state.conversationHydration, [conversationId]: 'hydrated' },
    }))
  },
  setConversationPreview: (conversationId: string, message: Message | null, unreadCount: number) => {
    set((state) => ({
      messagesPerConversation: {
        ...state.messagesPerConversation,
        [conversationId]: message ? [message] : [],
      },
      conversationHydration: {
        ...state.conversationHydration,
        [conversationId]: 'preview',
      },
      conversationUnreadCounts: {
        ...state.conversationUnreadCounts,
        [conversationId]: unreadCount,
      },
    }))
  },
  setConversationPreviews: (entries) => {
    if (!entries?.length) return
    set((state) => {
      const messagesPerConversation = { ...state.messagesPerConversation }
      const conversationHydration = { ...state.conversationHydration }
      const conversationUnreadCounts = { ...state.conversationUnreadCounts }
      for (const { conversationId, message, unreadCount } of entries) {
        if (!conversationId) continue
        messagesPerConversation[conversationId] = message ? [message] : []
        conversationHydration[conversationId] = 'preview'
        if (typeof unreadCount === 'number') {
          conversationUnreadCounts[conversationId] = unreadCount
        }
      }
      return {
        messagesPerConversation,
        conversationHydration,
        conversationUnreadCounts,
      }
    })
  },
  addOlderMessages: (conversationId: string, messages: Message[]) => {
    set((state) => {
      const existing = state.messagesPerConversation[conversationId] || []
      const newMessages = messages.filter((m) => !existing.some((m2) => m2.id === m.id))
      return {
        messagesPerConversation: {
          ...state.messagesPerConversation,
          [conversationId]: [...existing, ...newMessages],
        },
      }
    })
  },
  addNewMessage: (conversationId: string, message: Message) => {
    const currentUserId = get().user?.id
    set((state) => {
      const existing = state.messagesPerConversation[conversationId] || []
      if (existing.some((m) => m.id === message.id)) {
        return state
      }
      const nextMessages = [message, ...existing]
      const nextUnread = message.sender === currentUserId
        ? 0
        : (state.conversationUnreadCounts[conversationId] || 0) + 1

      return {
        messagesPerConversation: {
          ...state.messagesPerConversation,
          [conversationId]: nextMessages,
        },
        conversationHydration: {
          ...state.conversationHydration,
          [conversationId]: nextMessages.length > 1 ? 'hydrated' : (state.conversationHydration[conversationId] ?? 'preview'),
        },
        conversationUnreadCounts: {
          ...state.conversationUnreadCounts,
          [conversationId]: nextUnread,
        },
      }
    })
  },
  setOldestLoadedMessageDate: (conversationId: string, dateString: string) => {
    set((state) => ({
      oldestLoadedMessageDate: {
        ...state.oldestLoadedMessageDate,
        [conversationId]: dateString,
      },
    }))
  },
  setFirstMessageDate: (conversationId: string, dateString: string) => {
    set((state) => ({
      firstMessageDate: { ...state.firstMessageDate, [conversationId]: dateString },
    }))
  },
  loadConversationMessages: async (conversationId: string, options?: { force?: boolean }) => {
    const { force } = options || {}
    const { conversationHydration, conversationLoading } = get()
    if (!force && conversationHydration[conversationId] === 'hydrated') return
    if (conversationLoading[conversationId]) return

    set((state) => ({
      conversationLoading: { ...state.conversationLoading, [conversationId]: true },
    }))

    try {
      const page = await pocketbase.collection('messages').getList<Message>(1, PAGE_SIZE, {
        filter: `conversation = "${conversationId}"`,
        sort: '-created',
      })

      const items = page.items || []
      const oldest = items[items.length - 1]?.created
      let firstMessageDate = oldest || ''

      if ((page.totalItems ?? items.length) > items.length) {
        const lastPage = Math.max(page.totalPages ?? 1, 1)
        const oldestResponse = await pocketbase.collection('messages').getList<Message>(lastPage, 1, {
          filter: `conversation = "${conversationId}"`,
          sort: 'created',
        })
        firstMessageDate = oldestResponse.items[0]?.created || firstMessageDate
      }

      set((state) => ({
        messagesPerConversation: {
          ...state.messagesPerConversation,
          [conversationId]: items,
        },
        conversationHydration: {
          ...state.conversationHydration,
          [conversationId]: 'hydrated',
        },
        conversationLoading: {
          ...state.conversationLoading,
          [conversationId]: false,
        },
        oldestLoadedMessageDate: oldest
          ? { ...state.oldestLoadedMessageDate, [conversationId]: oldest }
          : state.oldestLoadedMessageDate,
        firstMessageDate: firstMessageDate
          ? { ...state.firstMessageDate, [conversationId]: firstMessageDate }
          : state.firstMessageDate,
      }))
    } catch (error) {
      console.error('loadConversationMessages failed', error)
      set((state) => ({
        conversationLoading: {
          ...state.conversationLoading,
          [conversationId]: false,
        },
      }))
      throw error
    }
  },
  updateLastRead: async (conversationId: string, userId: string) => {
    try {
      const messagesForConversation = get().messagesPerConversation[conversationId]
      if (!Array.isArray(messagesForConversation) || messagesForConversation.length === 0) return

      const lastReadDate = messagesForConversation[0]?.created
      if (!lastReadDate) return

      const membershipsForConversation = get().memberships[conversationId]
      if (!Array.isArray(membershipsForConversation) || membershipsForConversation.length === 0) return

      const ownMembership = membershipsForConversation.find((m) => m.expand?.user.id === userId)
      if (!ownMembership?.id) return

      await pocketbase.collection('memberships').update(ownMembership.id, { last_read: lastReadDate })

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
  getNewMessages: async (conversationId: string, oldestLoadedMessageDate: string) => {
    const newMessages = await pocketbase.collection('messages').getList<Message>(1, PAGE_SIZE, {
      filter: `conversation = "${conversationId}" && created < "${oldestLoadedMessageDate}"`,
      sort: '-created',
    })
    return newMessages.items
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
  savesHydrated: false,
  setSaves: (saves: ExpandedSave[]) => {
    set(() => ({
      saves,
      savesHydrated: true,
    }))

    const userId = pocketbase.authStore.record?.id
    if (userId) {
      void simpleCache.set('saves', saves, userId).catch((error) => {
        console.warn('Persisting saves cache failed', error)
      })
    }
  },
  addSave: async (userId: string) => {
    const savedBy = pocketbase.authStore.record?.id
    if (!savedBy) {
      console.warn('addSave called without an authenticated user')
      return
    }

    try {
      const id = (
        await pocketbase.collection('saves').create<Save>({ user: userId, saved_by: savedBy })
      ).id
      const save = await pocketbase.collection('saves').getOne<ExpandedSave>(id, { expand: 'user' })
      let nextSaves: ExpandedSave[] = []
      set((state) => {
        const alreadyHave = state.saves.some((m) => m.id === save.id)
        nextSaves = alreadyHave ? state.saves : [...state.saves, save]
        return {
          saves: nextSaves,
          savesHydrated: true,
        }
      })
      void simpleCache.set('saves', nextSaves, savedBy).catch((error) => {
        console.warn('Persisting saves cache failed', error)
      })
    } catch (error) {
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

            if (!existing) {
              throw new Error('Duplicate save lookup returned no record')
            }

            let nextSaves: ExpandedSave[] = []
            set((state) => {
              if (state.saves.some((m) => m.id === existing.id)) {
                nextSaves = state.saves
                return { saves: state.saves, savesHydrated: true }
              }
              nextSaves = [...state.saves, existing]
              return { saves: nextSaves, savesHydrated: true }
            })
            void simpleCache.set('saves', nextSaves, savedBy).catch((cacheError) => {
              console.warn('Persisting saves cache failed', cacheError)
            })
            return
          } catch (fetchError) {
            console.error('Failed to hydrate existing save after duplicate response', fetchError)
            throw fetchError
          }
        }
      }

      console.error('addSave error', error)
      throw error
    }
  },
  removeSave: async (id: string) => {
    try {
      await pocketbase.collection('saves').delete(id)
      let nextSaves: ExpandedSave[] = []
      set((state) => {
        nextSaves = state.saves.filter((m) => m.id !== id)
        return {
          saves: nextSaves,
          savesHydrated: true,
        }
      })
      const userId = pocketbase.authStore.record?.id
      if (userId) {
        void simpleCache.set('saves', nextSaves, userId).catch((error) => {
          console.warn('Persisting saves cache failed', error)
        })
      }
    } catch (error) {
      console.error(error)
    }
  },
  ensureSavesLoaded: async () => {
    if (get().savesHydrated) return

    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      console.warn('ensureSavesLoaded called without auth user')
      return
    }

    try {
      const cached = await simpleCache.get<ExpandedSave[]>('saves', userId)
      if (cached) {
        set(() => ({ saves: cached, savesHydrated: true }))
        return
      }
    } catch (error) {
      console.warn('Reading saves cache failed', error)
    }

    try {
      const fresh = await pocketbase.collection('saves').getFullList<ExpandedSave>({ expand: 'user' })
      set(() => ({ saves: fresh, savesHydrated: true }))
      void simpleCache.set('saves', fresh, userId).catch((error) => {
        console.warn('Persisting saves cache failed', error)
      })
    } catch (error) {
      console.error('Failed to fetch saves list', error)
    }
  },
  archiveConversation: async (userId: string, conversationId: string) => {
    const membership = get().memberships[conversationId].find((m) => m.expand?.user.id === userId)
    if (membership) {
      await pocketbase.collection('memberships').update(membership.id, { archived: true })
    }
  },
  unarchiveConversation: async (userId: string, conversationId: string) => {
    const membership = get().memberships[conversationId].find((m) => m.expand?.user.id === userId)
    if (membership) {
      await pocketbase.collection('memberships').update(membership.id, { archived: false })
    }
  },
  leaveConversation: async (conversationId: string, userId: string) => {
    try {
      const membershipsForConversation = get().memberships[conversationId] || []
      const membership = membershipsForConversation.find((m) => m.expand?.user.id === userId)
      if (!membership?.id) return

      await pocketbase.collection('memberships').delete(membership.id)

      set((state) => {
        const nextMemberships = { ...state.memberships }
        const existingMemberships = nextMemberships[conversationId] || []
        const filteredMemberships = existingMemberships.filter((m) => m.id !== membership.id)
        if (filteredMemberships.length) {
          nextMemberships[conversationId] = filteredMemberships
        } else {
          delete nextMemberships[conversationId]
        }

        const omitKey = <T extends Record<string, any>>(collection: T): T => {
          const { [conversationId]: _removed, ...rest } = collection
          return rest as T
        }

        return {
          memberships: nextMemberships,
          conversations: omitKey(state.conversations),
          messagesPerConversation: omitKey(state.messagesPerConversation),
          conversationHydration: omitKey(state.conversationHydration),
          conversationLoading: omitKey(state.conversationLoading),
          conversationUnreadCounts: omitKey(state.conversationUnreadCounts),
          oldestLoadedMessageDate: omitKey(state.oldestLoadedMessageDate),
          firstMessageDate: omitKey(state.firstMessageDate),
        }
      })
    } catch (error) {
      console.warn('leaveConversation failed', { conversationId, userId, error })
      throw error
    }
  },
})
