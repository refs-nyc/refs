import { ModelSchema } from '@canvas-js/core'
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
    did: string
    firstName: string
    lastName: string
    location: string
    image: string
    created: string
    updated: string
  }) {
    await this.db.set('profile', {
      ...createProfileArgs,
      updated: null,
    })
  }

  async updateProfileLocation(location: string) {
    const existingProfile = await this.db.get('profile', this.did)
    if (!existingProfile) {
      throw new Error('Profile not found')
    }

    const updateArgs = { ...existingProfile, location, updated: formatDateString(new Date()) }
    await this.db.transaction(async () => {
      await this.db.update('profile', updateArgs)
    })
    return updateArgs
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
    const id = `${this.did}/${this.id}`
    // this creates a new item with the given fields
    const item = {
      id,
      creator: this.did,
      ...createItemArgs,
    }
    await this.db.set('item', item)
    return item
  }

  async updateRefTitle(refId: string, title: string) {
    // this updates the ref with the given fields
    const existingRef = await this.db.get('ref', refId)
    if (!existingRef) {
      throw new Error('Ref not found')
    }
    const updateArgs = { ...existingRef, title, updated: formatDateString(new Date()) }
    await this.db.transaction(async () => {
      await this.db.update('ref', updateArgs)
    })
    return updateArgs
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

    const existingItem = await this.db.get('item', itemId)
    if (!existingItem) {
      throw new Error('Item not found')
    }

    const updateArgs = {
      ...existingItem,
      text: updateItemFields.text ?? existingItem.text,
      image: updateItemFields.image ?? existingItem.image,
      url: updateItemFields.url ?? existingItem.url,
      updated: updateItemFields.updated,
    }

    let existingRef = null
    const refId = existingItem?.ref?.toString()
    if (refId && updateItemFields.listTitle) {
      existingRef = await this.db.get('ref', refId)
      if (!existingRef) {
        throw new Error('Ref not found')
      }
    }

    await this.db.transaction(async () => {
      await this.db.update('item', updateArgs)

      if (existingRef) {
        await this.db.update('ref', {
          ...existingRef,
          title: updateItemFields.listTitle,
        })
      }
    })
    return updateArgs
  }

  async addItemToList(listItemId: string, itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    if (listItemId.split('/')[0] !== this.did) {
      throw new Error('List item creator does not match')
    }

    const existingItem = await this.db.get('item', itemId)
    if (!existingItem) {
      throw new Error('Item not found')
    }

    const updateArgs = {
      ...existingItem,
      id: itemId,
      parent: listItemId,
      updated: formatDateString(new Date()),
    }

    await this.db.transaction(async () => {
      await this.db.update('item', updateArgs)
    })
    return updateArgs
  }

  async removeItemFromList(listItemId: string, itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    if (listItemId.split('/')[0] !== this.did) {
      throw new Error('List item creator does not match')
    }

    const existingItem = await this.db.get('item', itemId)
    if (!existingItem) {
      throw new Error('Item not found')
    }

    const updateArgs = { ...existingItem, parent: null, updated: formatDateString(new Date()) }
    await this.db.transaction(async () => {
      await this.db.update('item', updateArgs)
    })

    return updateArgs
  }

  async moveItemToBacklog(itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    const existingItem = await this.db.get('item', itemId)
    if (!existingItem) {
      throw new Error('Item not found')
    }

    const updateArgs = { ...existingItem, backlog: true, updated: formatDateString(new Date()) }
    await this.db.transaction(async () => {
      await this.db.update('item', updateArgs)
    })
    return updateArgs
  }

  async removeItem(itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    await this.db.delete('item', itemId)
  }
}
