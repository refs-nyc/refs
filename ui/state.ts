import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { create } from 'zustand'

export const useUIStore = create<{
  editingProfile: boolean
  addingToList: string
  addingItem: ItemsRecord | null
  setAddingToList: (newState: string) => void
  stopEditProfile: () => void
  startEditProfile: () => void
}>((set) => ({
  addingToList: '',
  addingItem: null,
  setAddingToList: (newState: string) => {
    set(() => ({
      addingToList: newState,
    }))
  },
  editingProfile: false,
  stopEditProfile: () => {
    set(() => ({
      editingProfile: false,
    }))
  },
  startEditProfile: () => {
    set(() => ({
      editingProfile: true,
    }))
  },
}))
