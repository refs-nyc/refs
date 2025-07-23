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

  sendReaction: (messageId: string, emoji: string) => Promise<void>
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
    const { canvasApp, canvasActions } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }

    const lastMessage = (
      await canvasApp.db.query<Message>('message', {
        where: { conversation: conversationId },
        orderBy: { created: 'desc' },
        limit: 1,
      })
    )[0]

    const lastReadDate = lastMessage ? lastMessage.created : ''
    await canvasActions.updateMembershipLastRead(`${user.did}/${conversationId}`, lastReadDate)
  },

  getNewMessages: async (conversationId: string, oldestLoadedMessageDate: string) => {
    const newMessages = await pocketbase.collection('messages').getList<Message>(0, PAGE_SIZE, {
      filter: `conversation = "${conversationId}" && created < "${oldestLoadedMessageDate}"`,
      sort: '-created',
    })
    return newMessages.items
  },

  sendReaction: async (messageId, emoji) => {
    const { canvasActions } = get()

    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }
    // TODO: encrypt the contents (in this case, the emoji)
    const encryptedData = 'TODO'

    await canvasActions.createReaction({
      message: messageId,
      emoji,
      created: '',
      encrypted_data: encryptedData,
    })
  },
  deleteReaction: async (id: string) => {
    const { canvasActions } = get()

    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }

    await canvasActions.deleteReaction(id)
  },

  archiveConversation: async (user: Profile, conversationId: string) => {
    const { canvasApp, canvasActions } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }

    const membership = (
      await canvasApp.db.query('membership', {
        where: { user: user.did, conversation: conversationId },
      })
    )[0]

    if (membership) {
      await canvasActions.archiveMembership(membership.id)
    }
  },
  unarchiveConversation: async (user: Profile, conversationId: string) => {
    const { canvasApp, canvasActions } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }

    const membership = (
      await canvasApp.db.query('membership', {
        where: { user: user.did, conversation: conversationId },
      })
    )[0]

    if (membership) {
      await canvasActions.unArchiveMembership(membership.id)
    }
  },
})
