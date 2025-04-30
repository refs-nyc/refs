import { StagedRef, Item, Profile, CompleteRef } from './types'
import { Canvas, CanvasLoadable, Actions, ModelSchema } from '@canvas-js/core'
// @ts-ignore
import { GossipLog } from '@canvas-js/gossiplog/sqlite-expo'

// ensure gossiplog is bundled
console.log(GossipLog && '@canvas-js/gossiplog successfully bundled')

type ModelAPI = any

// todo: fill nullable fields inside db.set()
const itemFields = ([] as string[])
  .concat(['backlog', 'created', 'deleted', 'string', 'list', 'image', 'location'])
  .concat(['order', 'ref', 'text', 'updated', 'url'])
const itemRelations = ['children']
const profileFields = ['created', 'geolocation', 'image', 'location', 'updated']
const profileRelations = ['items']
const refFields = [
  'created',
  'creator',
  'deleted',
  'image',
  'location',
  'meta',
  'title',
  'type',
  'updated',
  'url',
]
const refRelations = [] as string[]
const userFields = ([] as string[])
  .concat(['created', 'email', 'emailVisibility', 'firstName', 'geolocation', 'image', 'lastName'])
  .concat(['location', 'password', 'pushToken', 'tokenKey', 'updated', 'verified'])
const userRelations = ['items']

const fill = <T extends Record<string, any>>(item: T, fields: string[], relations: string[]) => {
  const result = { ...item } as Record<string, any>

  for (const field of fields) {
    if (!(field in result)) {
      result[field] = null
    }
  }
  for (const relation of relations) {
    if (!(relation in result)) {
      result[relation] = []
    }
  }
  return result as T
}

const models = {
  item: {
    backlog: 'boolean?',
    children: '@items[]',
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
    items: '@items[]',
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
    meta: 'string?',
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
    // @ts-ignore
    this.db.set('item', fill(item, itemFields, itemRelations))
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
    // @ts-ignore
    this.db.set('item', fill({ ...item, backlog: true }, itemFields, itemRelations))
  },
} satisfies Actions<typeof models>

const refActions = {
  pushRef(ref: CompleteRef) {
    // @ts-ignore
    this.db.set('ref', fill(ref, refFields, refRelations))
  },
  async addRefMetadata(refId: string, { type, meta }: { type: string; meta: string }) {
    const ref = await this.db.get('ref', refId)
    if (!ref) return // TODO: ref might be missing id
    // @ts-ignore
    this.db.set('ref', fill({ ...ref, metadata: { type, meta } }, refFields, refRelations))
  },
  removeRef: async (refId: string) => {
    // @ts-ignore
    this.db.delete('ref', refId)
  },
} satisfies Actions<typeof models>

const userActions = {
  async updateUser(userId: string, fields: Partial<Profile>) {
    const user = await this.db.get('user', userId)
    // @ts-ignore
    this.db.set('user', fill({ user, ...fields }, userFields, userRelations))
  },
  async registerUser(fields: Omit<Profile, 'id'>) {
    // @ts-ignore
    this.db.set('user', fill({ ...fields }, userFields, userRelations))
  },
  async attachItem(userId: string, itemId: string) {
    this.db.set('user_item_association', { id: `${userId}/${itemId}`, user: userId, item: itemId })
  },
  async removeUserItemAssociation(userId: string, itemId: string) {
    this.db.delete('user_item_association', `${userId}/${itemId}`)
  },
} satisfies Actions<typeof models>

// const userViews = {
//   async getProfileByUsername( userName: string) {
//     return this.db.get('user', {
//       where: { userName },
//       include: { items: { ref: {}, children: {} } },
//     })
//   },
//   async getUserByEmail( email: string) {
//     return this.db.get('user').get({ where: { email: email } })
//   },
// } satisfies Actions<typeof models>

export const actions = {
  ...itemActions,
  ...userActions,
  ...refActions,
}

export const canvasApp = new CanvasLoadable({
  topic: 'alpha.refs.nyc',
  contract: { models, actions },
}) as unknown as Canvas<typeof models, typeof actions>
