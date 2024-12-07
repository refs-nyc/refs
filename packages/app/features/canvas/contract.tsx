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

  return app
}

export const appPromise = init()

export function CanvasContract({ children }) {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const start = async () => {
      try {
        const app = await appPromise; // Wait for the app to initialize
        console.log('App initialized:', app);
        setCtx(app); // Set the app in the context
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    start(); // Trigger the initialization logic
  }, []); // Empty dependency array ensures this runs only once

  return (
    <CanvasContext.Provider value={ctx}>
      {children}
    </CanvasContext.Provider>
  );
}