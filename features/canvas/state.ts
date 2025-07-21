import { Canvas } from '@canvas-js/core/sync'
import { Canvas as Core } from '@canvas-js/core'
import { StateCreator } from 'zustand'
import type { StoreSlices } from '../stores/types'
import RefsContract from './contract'

const canvasUrl = process.env.EXPO_PUBLIC_CANVAS_URL
if (!canvasUrl) {
  throw new Error('EXPO_PUBLIC_CANVAS_URL is not set')
}

export const canvasApp = new Canvas({
  contract: RefsContract,
  topicOverride: 'alpha.refs.nyc.RefsContract:a7931dd4167ded6b183261b82c95927a',
}) as Core<typeof RefsContract.models, RefsContract>

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
