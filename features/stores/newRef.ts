import type { StateCreator } from 'zustand'
import type { StoreSlices } from './types'
type StagedPhoto = {
  uri: string
  width: number
  height: number
}

const initialState = {
  newRefTarget: null as 'grid' | 'backlog' | null,
  newRefPrompt: null as string | null,
  newRefPhoto: null as StagedPhoto | null,
}

export type NewRefSlice = {
  newRefTarget: 'grid' | 'backlog' | null
  newRefPrompt: string | null
  newRefPhoto: StagedPhoto | null
  openNewRef: (options?: {
    prompt?: string
    target?: 'grid' | 'backlog'
    photo?: StagedPhoto | null
  }) => void
  closeNewRef: () => void
  resetNewRefStage: () => void
}

export const createNewRefSlice: StateCreator<StoreSlices, [], [], NewRefSlice> = (set, _get) => ({
  ...initialState,
  openNewRef: (options) => {
    const target = options?.target ?? 'grid'
    const prompt = options?.prompt ?? null
    const photo = options?.photo ?? null

    if (__DEV__) {
      console.log('[new-ref] open request', { target, hasPrompt: Boolean(prompt), hasPhoto: Boolean(photo) })
    }

    set({
      newRefTarget: target,
      newRefPrompt: prompt,
      newRefPhoto: photo,
    })
  },
  closeNewRef: () => {
    if (__DEV__) {
      console.log('[new-ref] close request')
    }
    set(initialState)
  },
  resetNewRefStage: () => {
    if (__DEV__) {
      console.log('[new-ref] reset stage')
    }
    set(initialState)
  },
})
