import { Item, Profile, CompleteRef } from './types'
import { Canvas, CanvasLoadable, Actions, ModelSchema } from '@canvas-js/core'

const models = {
  item: {
    backlog: 'boolean?',
    children: '@item[]',
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
  profile: {
    created: 'string?',
    firstName: 'string',
    geolocation: 'string?',
    id: 'primary',
    image: 'string?',
    items: '@item[]',
    lastName: 'string',
    location: 'string?',
    updated: 'string?',
    userName: 'string',
  },
  ref: {
    created: 'string?',
    creator: '@user?',
    deleted: 'string?',
    id: 'primary',
    image: 'string?',
    location: 'string?',
    meta: 'json',
    title: 'string?',
    type: 'string?', // "place" | "artwork" | "other"
    updated: 'string?',
    url: 'string?',
  },
  user: {
    created: 'string?',
    email: 'string?',
    emailVisibility: 'boolean?',
    firstName: 'string?',
    geolocation: 'string?',
    id: 'primary',
    image: 'string?',
    items: '@item[]',
    lastName: 'string?',
    location: 'string?',
    password: 'string?',
    pushToken: 'string?',
    tokenKey: 'string',
    updated: 'string?',
    userName: 'string',
    verified: 'boolean?',
  },
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

const itemActions = {
  pushItem(item: Item) {
    const finalItem = {
      ...item,
      backlog: item.backlog ?? null,
      created: item.created ?? null,
      creator: item.creator ?? null,
      deleted: item.deleted ?? null,
      list: item.list ?? null,
      image: item.image ?? null,
      location: item.location ?? null,
      order: item.order ?? null,
      ref: item.ref ?? null,
      text: item.text ?? null,
      updated: item.updated ?? null,
      url: item.url ?? null,
      children: item.children ?? [],
    }
    this.db.set('item', finalItem)
  },
  removeItem(itemId: string) {
    this.db.delete('item', itemId)
  },
  addItemToList(itemId: string, ref: CompleteRef) {
    this.db.set('item_ref_association', { id: `${itemId}/${ref.id}`, item: itemId, ref: ref.id })
  },
  removeItemFromList(itemId: string, ref: CompleteRef) {
    this.db.delete('item_ref_association', `${itemId}/${ref.id}`)
  },
  async moveItemToBacklog(itemId: string) {
    const item = await this.db.get('item', itemId)
    if (!item) throw new Error()
    this.db.set('item', { ...item, backlog: true })
  },
} satisfies Actions<typeof models>

const refActions = {
  pushRef(ref: CompleteRef) {
    const finalRef = {
      ...ref,
      created: ref.created ?? null,
      creator: ref.creator ?? null,
      deleted: ref.deleted ?? null,
      image: ref.image ?? null,
      location: ref.location ?? null,
      meta: ref.meta ?? null,
      title: ref.title ?? null,
      type: ref.type ?? null,
      updated: ref.updated ?? null,
      url: ref.url ?? null,
    }
    this.db.set('ref', finalRef)
  },
  async addRefMetadata(refId: string, { location, author }: { location: string; author: string }) {
    const ref = await this.db.get('ref', refId)
    if (!ref) return // TODO: ref might be missing id
    this.db.set('ref', { ...ref, meta: { location, author } })
  },
  async removeRef(refId: string) {
    this.db.delete('ref', refId)
  },
} satisfies Actions<typeof models>

const userActions = {
  async updateUser(userId: string, fields: Partial<Profile>) {
    const user = await this.db.get('user', userId)
    if (user === null) throw new Error('invalid userId')
    this.db.set('user', { ...user, ...fields })
  },
  async registerUser(profile: Omit<Profile, 'id'>) {
    const finalUser = {
      id: this.id,
      ...profile,
      created: profile.created ?? null,
      email: profile.email ?? null,
      emailVisibility: profile.emailVisibility ?? null,
      firstName: profile.firstName ?? null,
      geolocation: profile.location ?? null,
      image: profile.image ?? null,
      lastName: profile.lastName ?? null,
      location: profile.location ?? null,
      password: null,
      pushToken: profile.pushToken ?? null,
      tokenKey: profile.tokenKey ?? null,
      updated: profile.updated ?? null,
      verified: profile.verified ?? null,
      items: profile.items ?? [],
    }
    this.db.set('user', finalUser)
  },
  async attachItem(userId: string, itemId: string) {
    this.db.set('user_item_association', { id: `${userId}/${itemId}`, user: userId, item: itemId })
  },
  async removeUserItemAssociation(userId: string, itemId: string) {
    this.db.delete('user_item_association', `${userId}/${itemId}`)
  },
} satisfies Actions<typeof models>

export const actions = {
  ...itemActions,
  ...userActions,
  ...refActions,
}

export const canvasApp = new CanvasLoadable({
  topic: 'alpha.refs.nyc',
  contract: { models, actions },
}) as unknown as Canvas<typeof models, typeof actions>
