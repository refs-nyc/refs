import { Canvas } from '@canvas-js/core/sync'
import { StateCreator } from 'zustand'
import type { StoreSlices } from '../stores/types'
import RefsContract from './contract'
import type { SessionSigner } from '@canvas-js/interfaces'

const canvasUrl = process.env.EXPO_PUBLIC_CANVAS_URL
if (!canvasUrl) {
  throw new Error('EXPO_PUBLIC_CANVAS_URL is not set')
}

const topicOverride = process.env.EXPO_PUBLIC_CANVAS_TOPIC_OVERRIDE
if (!topicOverride) {
  throw new Error('EXPO_PUBLIC_CANVAS_TOPIC_OVERRIDE is not set')
}

const canvasApp = new Canvas({
  contract: RefsContract,
  topicOverride,
})

export type CanvasSlice = {
  connectCanvas: () => Promise<void>
  canvasIsConnected: boolean
  sessionSigner: SessionSigner | null
  setSessionSigner: (signer: SessionSigner) => void
}

export const createCanvasSlice: StateCreator<StoreSlices, [], [], CanvasSlice> = (set) => ({
  connectCanvas: async () => {
    await canvasApp.connect(canvasUrl)
    set({ canvasIsConnected: true })
  },
  canvasIsConnected: false,
  sessionSigner: null,
  setSessionSigner: (signer: SessionSigner) => {
    set({ sessionSigner: signer })
  },
})
