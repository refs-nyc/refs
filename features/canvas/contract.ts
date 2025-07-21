import { Canvas, ModelSchema } from '@canvas-js/core'
import { Contract } from '@canvas-js/core/contract'
import { formatDateString } from '../utils'

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
        deleted: 'string?',
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
        deleted: 'string?',
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
        image: 'string?',
        replying_to: '@message?',
        sender: '@profile',
        text: 'string?',
      },
      reaction: {
        id: 'primary',
        created: 'string',
        emoji: 'string',
        message: '@message',
        user: '@profile',
        updated: 'string?',
      },
      save: {
        created: 'string',
        id: 'primary',
        saved_by: '@profile',
        updated: 'string?',
        user: '@profile',
      },
    } satisfies ModelSchema
  }

  async createProfile(createProfileArgs: {
    firstName: string
    lastName: string
    location: string
    image: string
    created: string
    updated: string
  }) {
    return await this.db.transaction(async () => {
      const newProfile = {
        ...createProfileArgs,
        did: this.did,
        updated: null,
      }
      await this.db.set('profile', newProfile)
      return newProfile
    })
  }

  async updateProfileLocation(location: string) {
    return await this.db.transaction(async () => {
      const updateArgs = { did: this.did, location, updated: formatDateString(new Date()) }

      await this.db.update('profile', updateArgs)
    })
  }

  async createRef(createRefArgs: {
    title: string
    meta: string
    image: string
    url: string
    created: string
    updated: string | null
    deleted: string | null
  }) {
    return await this.db.transaction(async () => {
      const id = `${this.did}/${this.id}`
      // this creates a new ref with the given fields
      const ref = {
        id,
        creator: this.did,
        showInTicker: false,
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
    created: string
    updated: string | null
    deleted: string | null
  }) {
    return await this.db.transaction(async () => {
      const id = `${this.did}/${this.id}`
      // this creates a new item with the given fields
      const item = {
        id,
        creator: this.did,
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
      const updateArgs = { id: refId, title, updated: formatDateString(new Date()) }
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
      updated: string | null
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
        updated: updateItemFields.updated,
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
        updated: formatDateString(new Date()),
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
      const updateArgs = { id: itemId, parent: null, updated: formatDateString(new Date()) }
      await this.db.update('item', updateArgs)
    })
  }

  async moveItemToBacklog(itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    await this.db.transaction(async () => {
      const updateArgs = { id: itemId, backlog: true, updated: formatDateString(new Date()) }
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
}

export type RefsCanvas = Canvas<typeof RefsContract.models, RefsContract>
