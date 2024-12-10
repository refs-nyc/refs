import 'event-target-polyfill'
import 'fast-text-encoding'

import { models } from './models'
import { Canvas } from '@canvas-js/core'
import { createContext, useContext, useEffect, useState } from 'react'

export const CanvasContext = createContext(null)

export function useCanvasContext() {
  return useContext(CanvasContext)
}

const init = async () => {
  const app = await Canvas.initialize({
    //
    contract: {
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
        createRef(
          db,
          { title, firstReferral = null, image = null, location = null, referrals = [] }
        ) {
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
        createItem(
          db,
          { ref, text = null, image = null, location = null, url = null, children = [] }
        ) {
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
    },
    topic: 'refsv2.canvas.xyz',
  })

  return app
}

export const appPromise = init()

export function CanvasContract({ children }) {
  const [ctx, setCtx] = useState(null)

  useEffect(() => {
    const start = async () => {
      try {
        const app = await appPromise // Wait for the app to initialize
        console.log('App initialized:', app)
        setCtx(app) // Set the app in the context
      } catch (error) {
        console.error('Error initializing app:', error)
      }
    }

    start() // Trigger the initialization logic
  }, []) // Empty dependency array ensures this runs only once

  return <CanvasContext.Provider value={ctx}>{children}</CanvasContext.Provider>
}
