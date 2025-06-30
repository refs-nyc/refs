import { create } from 'zustand'
import {
  Conversation,
  ExpandedMembership,
  ExpandedReaction,
  ExpandedSave,
  Message,
  Reaction,
  Save,
} from './types'
import { pocketbase } from '../pocketbase'

export const PAGE_SIZE = 10

type MessageStore = {
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
  oldestLoadedMessageDate: Record<string, string>
  setOldestLoadedMessageDate: (conversationId: string, dateString: string) => void
  addOlderMessages: (conversationId: string, messages: Message[]) => void
  addNewMessage: (conversationId: string, message: Message) => void
  firstMessageDate: Record<string, string>
  setFirstMessageDate: (conversationId: string, dateString: string) => void
  updateLastRead: (conversationId: string, userId: string) => Promise<void>

  reactions: Record<string, ExpandedReaction[]>
  setReactions: (reactions: ExpandedReaction[]) => void
  addReaction: (reaction: ExpandedReaction) => void
  sendReaction: (senderId: string, messageId: string, emoji: string) => Promise<void>
  deleteReaction: (id: string) => Promise<void>
  removeReaction: (reaction: Reaction) => void

  saves: ExpandedSave[]
  setSaves: (saves: ExpandedSave[]) => void
  addSave: (userId: string, savedBy: string) => Promise<void>
  removeSave: (id: string) => Promise<void>
}

export const useMessageStore = create<MessageStore>((set, get) => ({
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
        oldestLoadedMessageDate: { ...state.oldestLoadedMessageDate, [conversationId]: dateString },
      }
    })
  },
  firstMessageDate: {},
  setFirstMessageDate: (conversationId: string, dateString: string) => {
    set((state) => {
      return { firstMessageDate: { ...state.firstMessageDate, [conversationId]: dateString } }
    })
  },

  updateLastRead: async (conversationId: string, userId: string) => {
    const lastMessage = get().messagesPerConversation[conversationId]
    const lastReadDate = lastMessage[0].created

    const memberships = get().memberships
    const ownMembership = memberships[conversationId].filter((m) => m.expand?.user.id === userId)[0]
    await pocketbase.collection('memberships').update(ownMembership.id, { last_read: lastReadDate })
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
  setSaves: (saves: ExpandedSave[]) => {
    set((state) => ({
      saves: saves,
    }))
  },
  addSave: async (userId: string, savedBy: string) => {
    try {
      const id = (
        await pocketbase.collection('saves').create<Save>({ user: userId, saved_by: savedBy })
      ).id
      const save = await pocketbase.collection('saves').getOne<ExpandedSave>(id, { expand: 'user' })
      set((state) => {
        if (!state.saves.length) return { saves: [save] }
        return {
          saves: state.saves.some((m) => m.id === save.id)
            ? [...state.saves]
            : [...state.saves, save],
        }
      })
    } catch (error) {
      console.error(error)
    }
  },
  removeSave: async (id: string) => {
    try {
      await pocketbase.collection('saves').delete(id)
      set((state) => {
        return {
          saves: state.saves.filter((m) => m.id !== id),
        }
      })
    } catch (error) {
      console.error(error)
    }
  },
}))
