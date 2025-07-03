import { Canvas as Core, ModelSchema } from '@canvas-js/core'
import { Contract } from '@canvas-js/core/contract'
import { item } from './item'
import { ref } from './ref'
import { profile } from './profile'

export default class RefsClassContract extends Contract<typeof RefsClassContract.models> {
  static get models() {
    return {
      item,
      ref,
      profile,
    } satisfies ModelSchema
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
