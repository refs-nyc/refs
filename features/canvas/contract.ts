import { Canvas, ModelSchema } from '@canvas-js/core'
import { Contract } from '@canvas-js/core/contract'
import { EthEncryptedData } from '../encryption'

export default class RefsContract extends Contract<typeof RefsContract.models> {
  public static get topic() {
    return 'alpha.refs.nyc'
  }

  static get models() {
    return {
      item: {
        // the id format is creator/<unique string>
        // this is so that we can enforce the create/update rules
        // i.e. an item can only be updated by its creator
        id: 'primary',
        creator: '@profile',
        ref: '@ref',
        parent: '@item?',

        image: 'string?',
        url: 'string?',
        text: 'string?',

        list: 'boolean?',
        backlog: 'boolean',

        promptContext: 'string?',

        created: 'string',
        updated: 'string?',

        $indexes: ['id'],
      },
      profile: {
        did: 'primary',

        firstName: 'string',
        lastName: 'string',
        location: 'string?',
        image: 'string?',

        created: 'string?',
        updated: 'string?',
      },
      ref: {
        // id has the format creator/<unique string>
        id: 'primary',
        creator: '@profile?',

        title: 'string?',
        image: 'string?',
        url: 'string?',
        meta: 'string?',

        showInTicker: 'boolean',

        created: 'string?',
        updated: 'string?',
      },

      // messaging related features
      encryption_key: {
        did: 'primary',
        publicEncryptionKey: 'string',
      },
      encryption_group: {
        id: 'primary',
        group_keys: 'string',
        key: 'string',
      },
      conversation: {
        id: 'primary',
        created: 'string',
        is_direct: 'boolean',
        title: 'string?',
      },
      membership: {
        archived: 'boolean?',
        conversation: '@conversation',
        created: 'string',
        id: 'primary',
        last_read: 'string?',
        updated: 'string?',
        user: '@profile',
      },
      message: {
        conversation: '@conversation',
        created: 'string',
        id: 'primary',
        encrypted_data: 'json',
        sender: '@profile',
        // encrypted fields:
        // image: 'string?',
        // replying_to: '@message?',
        // text: 'string?',
      },
      reaction: {
        id: 'primary',
        created: 'string',
        message: '@message',
        sender: '@profile',
        encrypted_data: 'json',
        // encrypted fields:
        // emoji: 'string',
      },
      save: {
        id: 'primary',
        created: 'string',
        saved_by: '@profile',
        user: '@profile',

        $indexes: ['id'],
      },
    } satisfies ModelSchema
  }

  async createProfile(
    createProfileArgs: {
      firstName: string
      lastName: string
      location: string
      image: string
    },
    publicEncryptionKey: string
  ) {
    return await this.db.transaction(async () => {
      const newProfile = {
        ...createProfileArgs,
        created: new Date(this.timestamp).toISOString(),
        did: this.did,
        updated: null,
      }
      await this.db.set('profile', newProfile)

      await this.db.set('encryption_key', {
        did: this.did,
        publicEncryptionKey: publicEncryptionKey,
      })
      return newProfile
    })
  }

  async updateProfileLocation(location: string) {
    return await this.db.transaction(async () => {
      const updateArgs = {
        did: this.did,
        location,
        updated: new Date(this.timestamp).toISOString(),
      }

      await this.db.update('profile', updateArgs)
    })
  }

  async createRef(createRefArgs: { title: string; meta: string; image: string; url: string }) {
    return await this.db.transaction(async () => {
      const id = `${this.did}/${this.id}`
      // this creates a new ref with the given fields
      const ref = {
        id,
        creator: this.did,
        showInTicker: false,
        created: new Date(this.timestamp).toISOString(),
        updated: null,
        deleted: null,
        ...createRefArgs,
      }
      await this.db.set('ref', ref)
      return ref
    })
  }

  async createItem(createItemArgs: {
    ref: string
    parent: string | null
    image: string
    url: string
    text: string
    list: boolean
    backlog: boolean
    promptContext: string | null
  }) {
    return await this.db.transaction(async () => {
      const id = `${this.did}/${this.id}`
      // this creates a new item with the given fields
      const item = {
        id,
        creator: this.did,
        created: new Date(this.timestamp).toISOString(),
        updated: null,
        deleted: null,
        ...createItemArgs,
      }
      await this.db.set('item', item)
      return item
    })
  }

  async updateRefTitle(refId: string, title: string) {
    if (refId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    return await this.db.transaction(async () => {
      const updateArgs = { id: refId, title, updated: new Date(this.timestamp).toISOString() }
      await this.db.update('ref', updateArgs)
    })
  }

  async updateItem(
    itemId: string,
    updateItemFields: {
      text?: string
      image?: string
      url?: string
      listTitle?: string | null
    }
  ) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    await this.db.transaction(async () => {
      const updateArgs = {
        id: itemId,
        text: updateItemFields.text,
        image: updateItemFields.image,
        url: updateItemFields.url,
        updated: new Date(this.timestamp).toISOString(),
      }
      await this.db.update('item', updateArgs)
    })
  }

  async addItemToList(listItemId: string, itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    if (listItemId.split('/')[0] !== this.did) {
      throw new Error('List item creator does not match')
    }

    await this.db.transaction(async () => {
      const updateArgs = {
        id: itemId,
        parent: listItemId,
        updated: new Date(this.timestamp).toISOString(),
      }
      await this.db.update('item', updateArgs)
    })
  }

  async removeItemFromList(listItemId: string, itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    if (listItemId.split('/')[0] !== this.did) {
      throw new Error('List item creator does not match')
    }

    await this.db.transaction(async () => {
      const updateArgs = {
        id: itemId,
        parent: null,
        updated: new Date(this.timestamp).toISOString(),
      }
      await this.db.update('item', updateArgs)
    })
  }

  async moveItemToBacklog(itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    await this.db.transaction(async () => {
      const updateArgs = {
        id: itemId,
        backlog: true,
        updated: new Date(this.timestamp).toISOString(),
      }
      await this.db.update('item', updateArgs)
    })
  }

  async removeItem(itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    await this.db.transaction(async () => {
      await this.db.delete('item', itemId)
    })
  }

  async createSave(createSaveParams: { user: string }) {
    return await this.db.transaction(async () => {
      const id = `${this.did}/${createSaveParams.user}`
      const newSave = {
        id,
        created: new Date(this.timestamp).toISOString(),
        saved_by: this.did,
        ...createSaveParams,
      }
      await this.db.set('save', newSave)
      return newSave
    })
  }

  async removeSave(saveId: string) {
    await this.db.transaction(async () => {
      if (saveId.split('/')[0] !== this.did) {
        throw new Error('Item creator does not match')
      }

      await this.db.delete('save', saveId)
    })
  }

  async createConversation(createConversationArgs: {
    otherMembers: string[]
    title?: string
    is_direct: boolean
  }) {
    const members = [...createConversationArgs.otherMembers, this.did]
    members.sort()

    const conversationId = members.join(',')

    await this.db.transaction(async () => {
      await this.db.create('conversation', {
        id: conversationId,
        created: new Date(this.timestamp).toISOString(),
        is_direct: createConversationArgs.is_direct,
        title: createConversationArgs.title || 'New Group Chat',
      })

      for (const member of members) {
        await this.db.create('membership', {
          archived: false,
          conversation: conversationId,
          created: new Date(this.timestamp).toISOString(),
          id: `${conversationId}/${member}`,
          last_read: null,
          updated: null,
          user: member,
        })
      }
    })
    return conversationId
  }

  async createMemberships(createMemberhipsParams: { conversationId: string; users: string[] }) {
    await this.db.transaction(async () => {
      for (const user of createMemberhipsParams.users) {
        await this.db.create('membership', {
          archived: false,
          conversation: createMemberhipsParams.conversationId,
          created: new Date(this.timestamp).toISOString(),
          id: `${createMemberhipsParams.conversationId}/${user}`,
          last_read: null,
          updated: null,
          user,
        })
      }
    })
  }

  async createEncryptionGroup({
    members,
    groupKeys,
    groupPublicKey,
  }: {
    members: string[]
    groupKeys: EthEncryptedData[]
    groupPublicKey: string
  }) {
    // TODO: enforce the encryption group is sorted correctly, and each groupKey is registered correctly
    if (members.indexOf(this.address) === -1) throw new Error()
    const id = members.join(',')

    await this.db.transaction(async () => {
      await this.db.set('encryption_group', {
        id,
        group_keys: JSON.stringify(groupKeys),
        key: groupPublicKey,
      })
    })
  }

  async createMessage(createMessageArgs: { conversation: string; encrypted_data: string }) {
    await this.db.transaction(async () => {
      await this.db.set('message', {
        id: `${this.did}/${createMessageArgs.conversation}`,
        created: new Date(this.timestamp).toISOString(),
        sender: this.did,
        ...createMessageArgs,
      })
    })
  }

  async createReaction(createReactionArgs: { message: string; encrypted_data: string }) {
    await this.db.transaction(async () => {
      await this.db.create('reaction', {
        id: `${this.did}/${createReactionArgs.message}`,
        sender: this.did,
        created: new Date(this.timestamp).toISOString(),
        ...createReactionArgs,
      })
    })
  }

  async deleteReaction(reactionId: string) {
    if (reactionId.split('/')[0] !== this.did) {
      throw new Error()
    }

    await this.db.transaction(async () => {
      await this.db.delete('reaction', reactionId)
    })
  }

  async updateMembershipLastRead(membershipId: string, lastRead: string) {
    if (membershipId.split('/')[0] !== this.did) {
      throw new Error()
    }

    await this.db.transaction(async () => {
      await this.db.update('membership', { id: membershipId, last_read: lastRead })
    })
  }

  async archiveMembership(membershipId: string) {
    if (membershipId.split('/')[0] !== this.did) {
      throw new Error()
    }

    await this.db.transaction(async () => {
      await this.db.update('membership', { id: membershipId, archived: true })
    })
  }

  async unArchiveMembership(membershipId: string) {
    if (membershipId.split('/')[0] !== this.did) {
      throw new Error()
    }

    await this.db.transaction(async () => {
      await this.db.update('membership', { id: membershipId, archived: false })
    })
  }
}

export type RefsCanvas = Canvas<typeof RefsContract.models, RefsContract>
