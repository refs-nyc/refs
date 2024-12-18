import 'event-target-polyfill'
import 'fast-text-encoding'

import { models } from './models'
import { init } from './contract'
import { Canvas, Contract } from '@canvas-js/core'
import { createContext, useContext, useEffect, useState } from 'react'

export const CanvasContext = createContext(null)

export function useCanvasContext() {
  return useContext(CanvasContext)
}

export const appPromise = init()

appPromise.then((app) => {
  app.connect('wss://refs.canvas.xyz')
})

export function CanvasProvider({ children }) {
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
