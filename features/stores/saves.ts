import { StateCreator } from 'zustand'
import { ExpandedSave, Profile, Save } from '../types'
import { StoreSlices } from './types'
import { formatDateString } from '../utils'

export type SavesSlice = {
  saves: ExpandedSave[]
  setSaves: (saves: ExpandedSave[]) => void
  addSave: (user: Profile, savedBy: Profile) => Promise<Save>
  removeSave: (id: string) => Promise<void>
}

export const createSaveSlice: StateCreator<StoreSlices, [], [], SavesSlice> = (set, get) => ({
  saves: [],
  setSaves: (saves: ExpandedSave[]) => {
    set(() => ({
      saves: saves,
    }))
  },
  addSave: async (user: Profile, savedBy: Profile) => {
    const { canvasActions } = get()
    if (!canvasActions) {
      throw new Error('Canvas not logged in!')
    }

    const { result } = await canvasActions.createSave({
      user: user.did,
      saved_by: savedBy.did,
      created: formatDateString(new Date()),
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
