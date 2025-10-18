import type { StateCreator } from 'zustand'
import type { StoreSlices } from './types'

export type InteractionGateSlice = {
  interactionGateActive: boolean
  activateInteractionGate: () => void
  deactivateInteractionGate: () => void
}

let releaseTimeout: ReturnType<typeof setTimeout> | null = null
const RELEASE_DELAY_MS = 250

export const createInteractionGateSlice: StateCreator<StoreSlices, [], [], InteractionGateSlice> = (set) => ({
  interactionGateActive: false,
  activateInteractionGate: () => {
    set({ interactionGateActive: true })
    if (releaseTimeout) {
      clearTimeout(releaseTimeout)
    }
    releaseTimeout = setTimeout(() => {
      releaseTimeout = null
      set({ interactionGateActive: false })
    }, RELEASE_DELAY_MS)
  },
  deactivateInteractionGate: () => {
    if (releaseTimeout) {
      clearTimeout(releaseTimeout)
      releaseTimeout = null
    }
    set({ interactionGateActive: false })
  },
})
