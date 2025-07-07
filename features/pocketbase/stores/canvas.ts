// Zustand store for the canvas client

import RefsClassContract from '@/features/canvas/classContract'
import { Canvas } from '@canvas-js/core'
import { SIWESigner } from '@canvas-js/signer-ethereum'
import { create } from 'zustand'

export const useCanvasStore = create<{
  app: Canvas<typeof RefsClassContract.models, RefsClassContract> | null
  initialize: () => Promise<Canvas<typeof RefsClassContract.models, RefsClassContract>>
}>((set, get) => ({
  app: null,
  initialize: async () => {
    // if the app is already initialized, return it
    const existingApp = get().app
    if (existingApp) {
      return existingApp
    }

    // otherwise initialize the app
    const canvasApp = await Canvas.initialize({
      topic: 'alpha.refs.nyc.RefsClassContract',
      contract: RefsClassContract,
      signers: [new SIWESigner({ burner: true })],
    })

    // and connect to the canvas server
    // url should be an env variable
    const canvasUrl = process.env.EXPO_PUBLIC_CANVAS_URL
    if (!canvasUrl) {
      throw new Error('EXPO_PUBLIC_CANVAS_URL is not set')
    }
    console.log('connecting to', canvasUrl)
    await canvasApp.connect(canvasUrl)

    set({ app: canvasApp })

    return canvasApp
  },
}))
