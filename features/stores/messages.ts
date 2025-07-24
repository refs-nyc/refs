import { StateCreator } from 'zustand'
import {
  Conversation,
  DecryptedMessage,
  EncryptionGroup,
  EncryptionKey,
  ExpandedMembership,
  Membership,
  Message,
  MessageDecryptedData,
  Profile,
  Reaction,
} from '../types'

import type { StoreSlices } from './types'
import { ethers } from 'ethers'
import {
  decryptSafely,
  encryptSafely,
  EthEncryptedData,
  getEncryptionPublicKey,
} from '../encryption'

export const PAGE_SIZE = 10

export type MessageSlice = {
  createConversation: (
    is_direct: boolean,
    otherMembers: Profile[],
    title?: string
  ) => Promise<string>

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

  decryptMessages: (conversationId: string, messages: Message[]) => Promise<DecryptedMessage[]>

  getConversation: (conversationId: string) => Promise<Conversation | null>
  getDirectConversation: (otherUserDid: string) => Promise<Conversation | null>
  getGroupConversations: () => Promise<Conversation[]>
  getMembers: (conversationId: string) => Promise<ExpandedMembership[]>
  getMembershipCount: (conversationId: string) => Promise<number>
  getMessagesForConversation: (conversationId: string) => Promise<DecryptedMessage[]>
  getLastMessageForConversation: (conversationId: string) => Promise<DecryptedMessage | null>
  getReactionsForMessage: (messageId: string) => Promise<Reaction[]>
  getNumberUnreadMessages: () => Promise<number>
}

export const createMessageSlice: StateCreator<StoreSlices, [], [], MessageSlice> = (set, get) => ({
  createConversation: async (
    is_direct: boolean,
    otherMembers: Profile[],
    title?: string
  ): Promise<string> => {
    const { canvasActions, canvasApp, user } = get()
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!user) {
      throw new Error('Not logged in!')
    }

    const { result: conversationId } = await canvasActions.createConversation({
      is_direct,
      otherMembers: otherMembers.map((member) => member.did),
      title,
    })

    const members = [...otherMembers, user]

    const groupPrivateKey = ethers.Wallet.createRandom().privateKey
    const groupPublicKey = getEncryptionPublicKey(groupPrivateKey.slice(2))
    const groupKeys = (
      await Promise.all(
        members.map((member) => canvasApp.db.get<EncryptionKey>('encryptionKeys', member.did))
      )
    )
      .map((result) => result?.publicEncryptionKey)
      .map((key) => {
        return encryptSafely({
          publicKey: key as string,
          data: groupPrivateKey,
          version: 'x25519-xsalsa20-poly1305',
        })
      })

    await canvasActions.createEncryptionGroup({
      members: members.map((member) => member.did),
      groupKeys,
      groupPublicKey,
    })

    return conversationId
  },

  async createMemberships(users, conversationId): Promise<void> {
    const { canvasActions } = get()
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }
    await canvasActions.createMemberships({
      conversationId,
      users: users.map((user) => user.did),
    })
  },

  sendMessage: async (sendMessageArgs) => {
    const { canvasActions, canvasApp, user, encryptionWallet, updateLastRead } = get()
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!user) {
      throw new Error('Not logged in!')
    }
    if (!encryptionWallet) {
      throw new Error('No encryption wallet exists for the current user')
    }

    const encryptionGroup = await canvasApp.db.get<EncryptionGroup>(
      'encryptionGroups',
      sendMessageArgs.conversationId
    )
    if (!encryptionGroup) {
      throw new Error(`Couldn't find encryption group for ${sendMessageArgs.conversationId}`)
    }

    const encryptedData = encryptSafely({
      publicKey: encryptionGroup.key as string,
      data: JSON.stringify({
        text: sendMessageArgs.text,
        imageUrl: sendMessageArgs.imageUrl,
        parentMessageId: sendMessageArgs.parentMessageId,
      }),
      version: 'x25519-xsalsa20-poly1305',
    })

    // call canvas action to create a message
    await canvasActions.createMessage({
      conversation: sendMessageArgs.conversationId,
      encrypted_data: JSON.stringify(encryptedData),
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

  decryptMessages: async (conversationId, messages) => {
    if (messages.length === 0) {
      return []
    }

    const { canvasApp, encryptionWallet, user } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    if (!encryptionWallet) {
      throw new Error('No encryption wallet exists for the current user')
    }

    if (!user) {
      throw new Error('Not logged in!')
    }

    // get the encryption group for this conversation
    const encryptionGroup = await canvasApp.db.get<EncryptionGroup>(
      'encryption_group',
      conversationId
    )
    if (!encryptionGroup) {
      throw new Error(`No encryption group exists for ${conversationId}`)
    }

    // extract my key from the encryption group
    const myKey = JSON.parse(encryptionGroup.group_keys)[user.did]

    const groupPrivateKey = decryptSafely({
      encryptedData: myKey,
      privateKey: encryptionWallet?.privateKey,
    })

    const decryptedMessages = []
    for (const message of messages) {
      // decrypt the message
      const decryptedData = decryptSafely({
        encryptedData: message.encrypted_data as EthEncryptedData,
        privateKey: groupPrivateKey,
      })

      const decryptedFields = JSON.parse(decryptedData) as MessageDecryptedData
      decryptedMessages.push({ ...message, expand: { decryptedData: decryptedFields } })
    }

    return decryptedMessages
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
    const { canvasApp, user, encryptionWallet } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!user) {
      throw new Error('Not logged in!')
    }

    const messages = await canvasApp.db.query<Message>('message', {
      where: { conversation: conversationId },
    })
    const decryptedMessages = await get().decryptMessages(conversationId, messages)

    return decryptedMessages
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

    const decryptedMessages = await get().decryptMessages(conversationId, messages)

    return decryptedMessages[0] || null
  },
  getReactionsForMessage: async (messageId) => {
    const { canvasApp } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }

    return await canvasApp.db.query<Reaction>('reaction', { where: { message: messageId } })
  },
  getNumberUnreadMessages: async () => {
    const { canvasApp, user } = get()
    if (!canvasApp) {
      throw new Error('Canvas not initialized!')
    }
    if (!user) {
      throw new Error('Not logged in!')
    }

    let unreadMessageCount = 0

    const myMemberships = await canvasApp.db.query<Membership>('membership', {
      where: { user: user.did },
    })

    for (const membership of myMemberships) {
      const countForConversation = await canvasApp.db.count('message', {
        conversation: membership.conversation,
        sender: { neq: user.did },
        created: {
          lt: membership.last_read,
        },
      })
      unreadMessageCount += countForConversation
    }

    return unreadMessageCount
  },
})
