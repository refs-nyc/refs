import { StateCreator } from 'zustand'
import { ConversationWithMemberships, ExpandedMembership, Message, Profile } from '../types'

import type { StoreSlices } from './types'

export const PAGE_SIZE = 10

export type MessageSlice = {
  createConversation: (
    is_direct: boolean,
    creator: Profile,
    otherMembers: Profile[],
    title?: string
  ) => Promise<string>

  getDirectConversations: () => Promise<ConversationWithMemberships[]>

  createMemberships: (users: Profile[], conversationId: string) => Promise<void>

  sendMessage: (
    sender: Profile,
    conversationId: string,
    text: string,
    parentMessageId?: string,
    imageUrl?: string
  ) => Promise<void>

  updateLastRead: (conversationId: string, user: Profile) => Promise<void>
  getNewMessages: (conversationId: string, oldestLoadedMessageDate: string) => Promise<Message[]>

  sendReaction: (sender: Profile, messageId: string, emoji: string) => Promise<void>
  deleteReaction: (id: string) => Promise<void>

  archiveConversation: (user: Profile, conversationId: string) => Promise<void>
  unarchiveConversation: (user: Profile, conversationId: string) => Promise<void>
}

export const createMessageSlice: StateCreator<StoreSlices, [], [], MessageSlice> = (set, get) => ({
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
    } catch (error) {
      console.error(error)
    }
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
