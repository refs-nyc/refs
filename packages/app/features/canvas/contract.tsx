import 'event-target-polyfill'
import 'fast-text-encoding'

import { useCanvas, useLiveQuery } from '@canvas-js/hooks'
import { createContext, useContext } from 'react'

export const CanvasContext = createContext(null)

export function useCanvasContext() {
  return useContext(CanvasContext)
}

export function CanvasContract({ children }) {
  const { app } = useCanvas(null, {
    contract: {
      models: {
        profiles: {
          did: 'primary',
          name: 'string',
          item1: '@item',
          item2: '@item',
          item3: '@item',
          items: '@item[]',
          // items: '@items[]', // TODO
          // image: 'string?', // TODO
        },
        items: {
          id: 'primary',
          title: 'string',
          // image: 'string?',
          // children: '@items[]', // TODO
          // parent: '@items', // TODO
        },
        counters: {
          id: 'primary',
          count: 'number',
        },
      },
      actions: {
        createProfile(db, name) {
          const { did } = this
          db.create('profiles', { did, name, items: [], image: null })
        },
        updateProfile(db, name) {
          const { did } = this
          db.update('profiles', { did, name })
        },
        createTextItem(db, title) {
          const { id } = this
          db.create('items', { id, title })
        },
        // createTextItem(db, title) {
        //   const { id } = this
        //   db.create("items", { id, title })
        // },
        removeTextItem(db, id) {
          db.delete('items', id)
        },
        async updateCounter(db) {
          const current = await db.get('counters', '0')
          db.set('counters', { id: '0', count: current ? current.count + 1 : 0 })
        },
      },
    },
    topic: 'refs.canvas.xyz',
  })

  // const counterRows = useLiveQuery(app, 'counters', { where: { id: '0' } })

  return <CanvasContext.Provider value={{ app }}>{children}</CanvasContext.Provider>
}
