import { ModelSchema } from '@canvas-js/core'
import { Contract } from '@canvas-js/core/contract'

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
        backlog: 'boolean?',
        order: 'number?',

        created: 'string?',
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

        created: 'string?',
        updated: 'string?',
        deleted: 'string?',
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
    this.db.set('profile', {
      ...createProfileArgs,
      updated: null,
    })
  }

  async updateProfile(updateProfileArgs: {
    id: string
    firstName: string
    lastName: string
    location: string
    image: string
    updated: string
  }) {
    this.db.update('profile', {
      ...updateProfileArgs,
    })
  }

  async createRef(createRefArgs: {
    id: string
    creator: string
    title: string
    meta: string
    image: string
    url: string
    created: string | null
    updated: string | null
    deleted: string | null
  }) {
    const idCreator = createRefArgs.id.split('/')[0]
    if (idCreator !== createRefArgs.creator && idCreator !== this.did) {
      throw new Error('Ref creator does not match')
    }

    // this creates a new ref with the given fields
    this.db.set('ref', createRefArgs)
  }

  async createItem(createItemArgs: {
    id: string
    creator: string
    ref: string
    parent: string | null
    image: string
    url: string
    text: string
    list: boolean
    backlog: boolean
    order: number
    created: string | null
    updated: string | null
    deleted: string | null
  }) {
    const idCreator = createItemArgs.id.split('/')[0]
    if (idCreator !== createItemArgs.creator && idCreator !== this.did) {
      throw new Error('Item creator does not match')
    }

    // this creates a new item with the given fields
    this.db.set('item', createItemArgs)
  }

  async updateRefTitle(refId: string, title: string) {
    // this updates the ref with the given fields
    this.db.update('ref', { id: refId, title })
  }

  async updateItem(
    itemId: string,
    updateItemFields: {
      text: string
      image: string
      url: string
      updated: string | null
    }
  ) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    // this updates the item with the given fields
    this.db.update('item', { id: itemId, ...updateItemFields })
  }

  async addItemToList(listItemId: string, itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    if (listItemId.split('/')[0] !== this.did) {
      throw new Error('List item creator does not match')
    }

    this.db.update('item', { id: itemId, parent: listItemId })
  }

  async removeItemFromList(listItemId: string, itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    if (listItemId.split('/')[0] !== this.did) {
      throw new Error('List item creator does not match')
    }

    this.db.update('item', { id: itemId, parent: null })
  }

  async moveItemToBacklog(itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    this.db.update('item', { id: itemId, backlog: true })
  }

  async removeItem(itemId: string) {
    if (itemId.split('/')[0] !== this.did) {
      throw new Error('Item creator does not match')
    }

    this.db.delete('item', itemId)
  }
}
