import { StateCreator } from 'zustand'
import { Conversation, ExpandedMembership, Membership, Message, Profile, Reaction } from '../types'

import type { StoreSlices } from './types'
import { formatDateString } from '../utils'

export const PAGE_SIZE = 10

export type MessageSlice = {
  createConversation: (
    is_direct: boolean,
    creator: Profile,
    otherMembers: Profile[],
    title?: string
  ) => Promise<string>

  getConversation: (conversationId: string) => Promise<Conversation | null>
  getDirectConversation: (otherUserDid: string) => Promise<Conversation | null>
  getGroupConversations: () => Promise<Conversation[]>
  getMembers: (conversationId: string) => Promise<ExpandedMembership[]>
  getMembershipCount: (conversationId: string) => Promise<number>
  getMessagesForConversation: (conversationId: string) => Promise<Message[]>
  getLastMessageForConversation: (conversationId: string) => Promise<Message | null>
  getReactionsForMessage: (messageId: string) => Promise<Reaction[]>

  createMemberships: (users: Profile[], conversationId: string) => Promise<void>

  sendMessage: (sendMessageArgs: {
    conversationId: string
    text: string
    parentMessageId?: string
    imageUrl?: string
  }) => Promise<void>

  updateLastRead: (conversationId: string) => Promise<void>

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
    const { canvasActions } = get()

    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }
    const { result: conversationId } = await canvasActions.createConversation({
      created: formatDateString(new Date()),
      is_direct,
      otherMembers: otherMembers.map((member) => member.did),
      title,
    })
    return conversationId
  },
  getConversation: async (conversationId: string) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    return await canvasApp.db.get<Conversation>('conversation', conversationId)
  },
  getDirectConversation: async (otherUserDid: string) => {
    const { canvasApp, user } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!user) {
      throw new Error('Not logged in!')
    }

    const myMemberships = await canvasApp.db.query<Membership>('membership', {
      where: { user: user.did },
    })

    const otherUserMemberships = await canvasApp.db.query<Membership>('membership', {
      where: { user: otherUserDid },
    })

    const myConversationIds = new Set(myMemberships.map((membership) => membership.conversation))
    const otherUserConversationIds = new Set(
      otherUserMemberships.map((membership) => membership.conversation)
    )

    const sharedConversationIds = myConversationIds.intersection(otherUserConversationIds)

    for (const conversationId of sharedConversationIds) {
      const conversation = await canvasApp.db.get<Conversation>(
        'conversation',
        conversationId as string
      )
      if (conversation?.is_direct) {
        return conversation
      }
    }
    return null
  },

  getGroupConversations: async () => {
    const { canvasApp, user } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!user) {
      throw new Error('Not logged in!')
    }

    const myMemberships = await canvasApp.db.query<Membership>('membership', {
      where: { user: user.did },
    })

    const groupConversations = []

    for (const membership of myMemberships) {
      const conversation = await canvasApp.db.get<Conversation>(
        'conversation',
        membership.conversation as string
      )
      if (!conversation) continue
      if (!conversation.is_direct) {
        groupConversations.push(conversation)
      }
    }

    return groupConversations
  },
  getMembers: async (conversationId) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const members: ExpandedMembership[] = []
    for (const membership of await canvasApp.db.query<Membership>('membership', {
      where: { conversation: conversationId },
    })) {
      const user = await canvasApp.db.get<Profile>('user', membership.user as string)
      if (!user) continue
      members.push({ ...membership, expand: { user } })
    }
    return members
  },
  async getMembershipCount(conversationId) {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    return await canvasApp.db.count('membership', { conversation: conversationId })
  },
  getMessagesForConversation: async (conversationId: string) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    return await canvasApp.db.query<Message>('message', { where: { conversation: conversationId } })
  },
  getLastMessageForConversation: async (conversationId) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    const messages = await canvasApp.db.query<Message>('message', {
      where: { conversation: conversationId },
      orderBy: { created: 'desc' },
      limit: 1,
    })
    return messages[0] || null
  },
  getReactionsForMessage: async (messageId) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    return await canvasApp.db.query<Reaction>('reaction', { where: { message: messageId } })
  },
  async createMemberships(users, conversationId): Promise<void> {
    const { canvasActions } = get()
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }
    await canvasActions.createMemberships({
      conversationId,
      users: users.map((user) => user.did),
      created: formatDateString(new Date()),
    })
  },

  sendMessage: async (sendMessageArgs) => {
    const { canvasActions, updateLastRead } = get()
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }

    // TODO: encrypt data
    // text, parentMessageId, imageUrl
    const encryptedData = 'TODO'

    // call canvas action to create a message
    await canvasActions.createMessage({
      conversation: sendMessageArgs.conversationId,
      encrypted_data: encryptedData,
      created: formatDateString(new Date()),
    })

    await updateLastRead(sendMessageArgs.conversationId)
  },

  updateLastRead: async (conversationId: string) => {
    const { canvasApp, canvasActions, user } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }
    if (!user) {
      throw new Error('Not logged in!')
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
      created: formatDateString(new Date()),
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
