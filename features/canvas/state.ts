import { Canvas } from '@canvas-js/core'
import { StateCreator } from 'zustand'
import type { StoreSlices } from '../stores/types'
import RefsContract, { type RefsCanvas } from './contract'

const canvasUrl = process.env.EXPO_PUBLIC_CANVAS_URL
if (!canvasUrl) {
  throw new Error('EXPO_PUBLIC_CANVAS_URL is not set')
}

export type CanvasSlice = {
  canvasApp: RefsCanvas | null
  connectCanvas: () => Promise<void>
  canvasIsConnected: boolean
}

export const createCanvasSlice: StateCreator<StoreSlices, [], [], CanvasSlice> = (set) => ({
  canvasApp: null,
  connectCanvas: async () => {
    const canvasApp = await Canvas.initialize({
      contract: RefsContract,
      topicOverride: 'alpha.refs.nyc.RefsContract:c516a8a8765e93e7bf255d02a97624e5',
    })

    await canvasApp.connect(canvasUrl)
    set({ canvasApp, canvasIsConnected: true })
  },
  canvasIsConnected: false,
})
