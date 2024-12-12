import { Canvas, type Contract } from '@canvas-js/core'
import { models } from './models.ts' // include .ts extension to make models importable by `npm run server`

export const contract = {
  models,
  actions: {
    // Profiles
    createProfile(db, { firstName, lastName, userName, items = [], image = null }) {
      db.create('profiles', {
        did: this.did,
        firstName,
        lastName,
        userName,
        items,
        image,
        location: null,
        geolocation: null,
      })

      return { did: this.did, userName }
    },
    // ***
    // Refs
    //
    //
    //
    createRef(db, { title, firstReferral = null, image = null, location = null, referrals = [] }) {
      db.create('refs', {
        id: this.id,
        title,
        image,
        createdAt: new Date().getTime(),
        deletedAt: null,
        firstReferral,
        location,
        referrals,
      })

      return this.id
    },
    //
    // ***
    // Items
    //
    //
    //
    createItem(db, { ref, text = null, image = null, location = null, url = null, children = [] }) {
      db.create('items', {
        id: this.id,
        ref,
        createdAt: new Date().getTime(),
        deletedAt: null,
        text,
        image,
        location,
        url,
        children,
      })

      return this.id
    },
    updateItem(db, id, ref, text, image, location, url, children) {
      db.update('items', { id, ref, text, image, location, url, children })
    },
    deleteItem(db, id) {
      db.update('items', { id, deletedAt: new Date().getTime() })
    },
    // Chats
  },
} satisfies Contract<typeof models>

export const init = async () => {
  const app = await Canvas.initialize({
    path: process.env.DATABASE_URL ?? null,
    contract,
    topic: 'refsv2.canvas.xyz',
  })

  return app
}
