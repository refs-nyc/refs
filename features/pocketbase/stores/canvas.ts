import { Canvas as Core, ModelSchema } from '@canvas-js/core'
import { Contract } from '@canvas-js/core/contract'
import { Canvas } from '@canvas-js/core/sync'

class RefsContract extends Contract<typeof RefsContract.models> {
  static get models() {
    return {
      item: {
        backlog: 'boolean?',
        parent: '@item?',
        created: 'string?',
        creator: '@user',
        deleted: 'string?',
        id: 'primary',
        image: 'string?',
        list: 'boolean?',
        location: 'string?',
        order: 'number?',
        ref: '@ref?',
        text: 'string?',
        updated: 'string?',
        url: 'string?',
      },
      ref: {
        created: 'string?',
        creator: '@user',
        deleted: 'string?',
        id: 'primary',
        image: 'string?',
        location: 'string?',
        meta: 'json',
        title: 'string?',
        updated: 'string?',
        url: 'string?',
      },
      user: {
        created: 'string?',
        // i don't think email should be public, because it's just used for auth
        email: 'string?',
        // do we need this?
        emailVisibility: 'boolean?',
        firstName: 'string?',
        geolocation: 'string?',
        id: 'primary',
        image: 'string?',
        lastName: 'string?',
        location: 'string?',
        password: 'string?',
        pushToken: 'string?',
        tokenKey: 'string',
        updated: 'string?',
        userName: 'string',
        verified: 'boolean?',
      },
      // why do we need these?
      user_item_association: {
        id: 'primary',
        item: '@item',
        user: '@user',
      },
      item_ref_association: {
        id: 'primary',
        item: '@item',
        ref: '@ref',
      },
    } satisfies ModelSchema
  }

  async createItemAndRef(
    title: string,
    image: string,
    text: string,
    meta: { location?: string; author?: string },
    backlog: boolean
  ) {}

  async createItem(refId: string, image: string, text: string) {}

  async createList(title: string) {}

  async addItemToList(listItemId: string, itemId: string) {}

  async removeItemFromList(listItemId: string, itemId: string) {}

  async moveItemToBacklog(itemId: string) {}

  async removeItem(itemId: string) {}
}

export const canvasApp = new Canvas({
  topic: 'alpha.refs.nyc',
  contract: RefsContract,
})
