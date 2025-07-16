import { Canvas } from '@canvas-js/core'
import { StateCreator } from 'zustand'
import type { StoreSlices } from '../stores/types'
import type { SessionSigner } from '@canvas-js/interfaces'
import RefsContract from './contract'

const canvasUrl = process.env.EXPO_PUBLIC_CANVAS_URL
if (!canvasUrl) {
  throw new Error('EXPO_PUBLIC_CANVAS_URL is not set')
}

const topicOverride = process.env.EXPO_PUBLIC_CANVAS_TOPIC_OVERRIDE
if (!topicOverride) {
  throw new Error('EXPO_PUBLIC_CANVAS_TOPIC_OVERRIDE is not set')
}

export type CanvasSlice = {
  canvasApp: Canvas | null
  initializeCanvas: (signer: SessionSigner) => Promise<void>
}

export const createCanvasSlice: StateCreator<StoreSlices, [], [], CanvasSlice> = (set) => ({
  canvasApp: null,
  initializeCanvas: async (signer: SessionSigner) => {
    const canvasApp = await Canvas.initialize({
      contract: RefsContract,
      signers: [signer],
      topicOverride,
    })

    await canvasApp.connect(canvasUrl)

    set({ canvasApp })
  },
})
