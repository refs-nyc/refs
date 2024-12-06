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
    //
    reset: true,
    //
    contract: {
      models,
      actions: {
        // Profiles
        createProfile(db, firstName, lastName, userName, items = [], image = null) {
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
        },
        updateProfile(db, firstName, lastName, userName, location, image) {
          db.update('profiles', { did: this.did, firstName, lastName, userName, location, image })
        },
        updateProfileItems(db, items) {
          db.update('profiles', { did: this.did, items })
        },
        // Items
        createItem(
          db,
          { ref, text = null, image = null, location = null, url = null, children = [] }
        ) {
          db.create('items', {
            id: this.id,
            createdAt: new Date().getTime(),
            deletedAt: null,
            ref,
            text,
            image,
            location,
            url,
            children,
          })
        },
        updateItem(db, id, ref, text, image, location, url, children) {
          db.update('items', { id, ref, text, image, location, url, children })
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
