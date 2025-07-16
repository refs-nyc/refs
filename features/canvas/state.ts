import { Canvas } from '@canvas-js/core/sync'
import { Canvas as Core } from '@canvas-js/core'
import { StateCreator } from 'zustand'
import type { StoreSlices } from '../stores/types'
import RefsContract from './contract'

const canvasUrl = process.env.EXPO_PUBLIC_CANVAS_URL
if (!canvasUrl) {
  throw new Error('EXPO_PUBLIC_CANVAS_URL is not set')
}

export const canvasTopic = process.env.EXPO_PUBLIC_CANVAS_TOPIC_OVERRIDE!
if (!canvasTopic) {
  throw new Error('EXPO_PUBLIC_CANVAS_TOPIC_OVERRIDE is not set')
}

export const canvasApp = new Canvas({
  contract: RefsContract,
  topicOverride: canvasTopic,
})

export type CanvasSlice = {
  connectCanvas: () => Promise<void>
  canvasIsConnected: boolean
}

export const createCanvasSlice: StateCreator<StoreSlices, [], [], CanvasSlice> = (set) => ({
  connectCanvas: async () => {
    await canvasApp.connect(canvasUrl)
    set({ canvasIsConnected: true })
  },
  canvasIsConnected: false,
})
