import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { create } from 'zustand'

export const useUIStore = create<{
  editingProfile: boolean
  addingToList: string
  addingItem: ItemsRecord | null
  showContextMenu: string
  setAddingToList: (newState: string) => void
  toggleEditProfile: () => void
  stopEditProfile: () => void
  startEditProfile: () => void
}>((set) => ({
  addingToList: '',
  showContextMenu: '',
  addingItem: null,
  setAddingToList: (newState: string) => {
    set(() => ({
      addingToList: newState,
    }))
  },
  editingProfile: false,
  toggleEditProfile: () => {
    set((state) => ({
      editingProfile: !state.editingProfile,
    }))
  },
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
