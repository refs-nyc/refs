import 'event-target-polyfill'
import 'fast-text-encoding'

import { models } from './models'
import { useCanvas, useLiveQuery } from '@canvas-js/hooks'
import { createContext, useContext } from 'react'

export const CanvasContext = createContext(null)

export function useCanvasContext() {
  return useContext(CanvasContext)
}

export function CanvasContract({ children }) {
  const { app } = useCanvas(null, {
    reset: true,
    contract: {
      models,
      actions: {
        // Profiles
        createProfile(db, firstname, lastname, username, items = [], image = null) {
          db.create('profiles', {
            did: this.did,
            firstname,
            lastname,
            username,
            items,
            image,
            location: null,
            geolocation: null,
          })
        },
        updateProfile(db, firstname, lastname, username, location, image) {
          db.update('profiles', { did: this.did, firstname, lastname, username, location, image })
        },
        updateProfileItems(db, items) {
          db.update('profiles', { did: this.did, items })
        },
        // Items
        createItem(
          db,
          { title, text = null, image = null, location = null, url = null, children = [] }
        ) {
          db.create('items', {
            id: this.id,
            createdAt: new Date().getTime(),
            deletedAt: null,
            title,
            text,
            image,
            location,
            url,
            children,
          })
        },
        updateItem(db, id, title, text, image, location, url, children) {
          db.update('items', { id, title, text, image, location, url, children })
        },
        deleteItem(db, id) {
          db.update('items', { id, deletedAt: new Date().getTime() })
        },
        // Chats
      },
    },
    topic: 'refsv2.canvas.xyz',
  })

  return <CanvasContext.Provider value={app}>{children}</CanvasContext.Provider>
}
