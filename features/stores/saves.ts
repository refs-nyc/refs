import { StateCreator } from 'zustand'
import { ExpandedSave, Profile, Save } from '../types'
import { StoreSlices } from './types'

export type SavesSlice = {
  saves: ExpandedSave[]
  setSaves: (saves: ExpandedSave[]) => void
  addSave: (otherUser: Profile) => Promise<Save>
  removeSave: (id: string) => Promise<void>
}

export const createSaveSlice: StateCreator<StoreSlices, [], [], SavesSlice> = (set, get) => ({
  saves: [],
  setSaves: (saves: ExpandedSave[]) => {
    set(() => ({
      saves: saves,
    }))
  },
  addSave: async (otherUser: Profile) => {
    const { canvasActions } = get()
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }

    const { result } = await canvasActions.createSave({
      user: otherUser.did,
    })

    return result
  },
  removeSave: async (id: string) => {
    const { canvasActions } = get()
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }

    await canvasActions.removeSave(id)
  },
})
