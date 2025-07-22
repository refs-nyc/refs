import { StateCreator } from 'zustand'
import {
  Conversation,
  ConversationWithMemberships,
  ExpandedMembership,
  ExpandedReaction,
  ExpandedSave,
  Message,
  Profile,
  Reaction,
  Save,
} from '../types'

import type { StoreSlices } from './types'

export const PAGE_SIZE = 10

export type MessageSlice = {
  conversations: Record<string, Conversation>
  setConversations: (conversations: Conversation[]) => void
  updateConversation: (conversation: Conversation) => void
  createConversation: (
    is_direct: boolean,
    creator: Profile,
    otherMembers: Profile[],
    title?: string
  ) => Promise<string>
  addConversation(conversation: Conversation): void
  getDirectConversations: () => Promise<ConversationWithMemberships[]>

  memberships: Record<string, ExpandedMembership[]>
  setMemberships: (memberships: ExpandedMembership[]) => void
  addMembership: (membership: ExpandedMembership) => void
  updateMembership: (membership: ExpandedMembership) => void
  createMemberships: (users: Profile[], conversationId: string) => Promise<void>

  sendMessage: (
    sender: Profile,
    conversationId: string,
    text: string,
    parentMessageId?: string,
    imageUrl?: string
  ) => Promise<void>
  messagesPerConversation: Record<string, Message[]>
  setMessagesForConversation: (conversationId: string, messages: Message[]) => void
  oldestLoadedMessageDate: Record<string, string>
  setOldestLoadedMessageDate: (conversationId: string, dateString: string) => void
  addOlderMessages: (conversationId: string, messages: Message[]) => void
  addNewMessage: (conversationId: string, message: Message) => void
  firstMessageDate: Record<string, string>
  setFirstMessageDate: (conversationId: string, dateString: string) => void
  updateLastRead: (conversationId: string, user: Profile) => Promise<void>
  getNewMessages: (conversationId: string, oldestLoadedMessageDate: string) => Promise<Message[]>

  reactions: Record<string, ExpandedReaction[]>
  setReactions: (reactions: ExpandedReaction[]) => void
  addReaction: (reaction: ExpandedReaction) => void
  sendReaction: (sender: Profile, messageId: string, emoji: string) => Promise<void>
  deleteReaction: (id: string) => Promise<void>
  removeReaction: (reaction: Reaction) => void

  archiveConversation: (user: Profile, conversationId: string) => Promise<void>
  unarchiveConversation: (user: Profile, conversationId: string) => Promise<void>
}

export const createMessageSlice: StateCreator<StoreSlices, [], [], MessageSlice> = (set, get) => ({
  conversations: {},
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
    creator: Profile,
    otherMembers: Profile[],
    title?: string
  ): Promise<string> => {
    try {
      const newConversation = await pocketbase.collection('conversations').create({
        is_direct,
        title: is_direct ? undefined : title || 'New Group Chat',
      })

      await pocketbase
        .collection('memberships')
        .create({ conversation: newConversation.id, user: creator.did })

      for (const member of otherMembers) {
        await pocketbase
          .collection('memberships')
          .create({ conversation: newConversation.id, user: member.did })
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
  async createMemberships(users, conversationId): Promise<void> {
    try {
      for (const user of users) {
        await pocketbase
          .collection('memberships')
          .create({ conversation: conversationId, user: user.did })
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
  sendMessage: async (sender, conversationId, text, parentMessageId, imageUrl) => {
    try {
      const message = await pocketbase.collection('messages').create<Message>({
        conversation: conversationId,
        text,
        sender: sender.did,
        replying_to: parentMessageId,
        image: imageUrl,
      })
      const membership = await pocketbase
        .collection('memberships')
        .getFirstListItem(`conversation = "${conversationId}" && user = "${sender.did}"`)
      await pocketbase
        .collection('memberships')
        .update(membership.id, { last_read: message.created })
    } catch (error) {
      console.error(error)
    }
  },

  messagesPerConversation: {},
  oldestLoadedMessageDate: {},
  setMessagesForConversation: (conversationId: string, messages: Message[]) => {
    set((state) => {
      return {
        messagesPerConversation: { ...state.messagesPerConversation, [conversationId]: messages },
      }
    })
  },
  addOlderMessages: (conversationId: string, messages: Message[]) => {
    set((state) => {
      const newMessages = messages.filter(
        (m) => !state.messagesPerConversation[conversationId].some((m2) => m2.id === m.id)
      )
      return {
        messagesPerConversation: {
          ...state.messagesPerConversation,
          [conversationId]: [...state.messagesPerConversation[conversationId], ...newMessages],
        },
      }
    })
  },
  addNewMessage: (conversationId: string, message: Message) => {
    set((state) => {
      if (state.messagesPerConversation[conversationId].some((m) => m.id === message.id))
        return state
      return {
        messagesPerConversation: {
          ...state.messagesPerConversation,
          [conversationId]: [message, ...state.messagesPerConversation[conversationId]],
        },
      }
    })
  },
  setOldestLoadedMessageDate: (conversationId: string, dateString: string) => {
    set((state) => {
      return {
        oldestLoadedMessageDate: {
          ...state.oldestLoadedMessageDate,
          [conversationId]: dateString,
        },
      }
    })
  },
  firstMessageDate: {},
  setFirstMessageDate: (conversationId: string, dateString: string) => {
    set((state) => {
      return { firstMessageDate: { ...state.firstMessageDate, [conversationId]: dateString } }
    })
  },

  updateLastRead: async (conversationId: string, user: Profile) => {
    const lastMessage = get().messagesPerConversation[conversationId]
    const lastReadDate = lastMessage[0].created

    const memberships = get().memberships
    const ownMembership = memberships[conversationId].filter(
      (m) => m.expand?.user.did === user.did
    )[0]
    await pocketbase.collection('memberships').update(ownMembership.id, { last_read: lastReadDate })
  },

  getNewMessages: async (conversationId: string, oldestLoadedMessageDate: string) => {
    const newMessages = await pocketbase.collection('messages').getList<Message>(0, PAGE_SIZE, {
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
  sendReaction: async (sender, messageId, emoji) => {
    try {
      await pocketbase.collection('reactions').create({
        message: messageId,
        emoji,
        user: sender.did,
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

  archiveConversation: async (user: Profile, conversationId: string) => {
    const membership = get().memberships[conversationId].find(
      (m) => m.expand?.user.did === user.did
    )
    if (membership) {
      await pocketbase.collection('memberships').update(membership.id, { archived: true })
    }
  },
  unarchiveConversation: async (user: Profile, conversationId: string) => {
    const membership = get().memberships[conversationId].find(
      (m) => m.expand?.user.did === user.did
    )
    if (membership) {
      await pocketbase.collection('memberships').update(membership.id, { archived: false })
    }
  },
})
