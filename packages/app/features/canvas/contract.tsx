import 'event-target-polyfill'
import 'fast-text-encoding'

import { models } from './models'
import { Canvas } from '@canvas-js/core'
import { createContext, useContext, useEffect, useState } from 'react'
import { Magic } from '@magic-sdk/react-native-expo'

export const CanvasContext = createContext(null)

export function useCanvasContext() {
  return useContext(CanvasContext)
}

const init = async () => {
  let magic: undefined | Magic

  const app = await Canvas.initialize({
    reset: true,
    //
    contract: {
      models,
      actions: {
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

export function CanvasContract({
  children,
  withMagic = true,
}: {
  children: React.ReactNode
  withMagic: boolean
}) {
  const [ctx, setCtx] = useState(null)

  let magic: Magic | undefined

  if (withMagic) {
    magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY as string)

    if (!magic) throw new Error('Could not initialize Magic')
  }

  useEffect(() => {
    const start = async () => {
      try {
        const app = await appPromise // Wait for the app to initialize

        console.log('App initialized:', app)
        setCtx({ app, magic }) // Set the app in the context
      } catch (error) {
        console.error('Error initializing app:', error)
      }
    }

    start() // Trigger the initialization logic
  }, []) // Empty dependency array ensures this runs only once

  return <CanvasContext.Provider value={ctx}>{children}</CanvasContext.Provider>
}
