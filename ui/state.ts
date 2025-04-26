import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { create } from 'zustand'

export const useUIStore = create<{
  editingProfile: boolean
  editingBacklog: boolean
  addingToList: string
  addingItem: ItemsRecord | null
  setAddingToList: (newState: string) => void
  toggleEditProfile: () => void
  stopEditProfile: () => void
  startEditProfile: () => void
  toggleEditBacklog: () => void
  stopEditBacklog: () => void
  startEditBacklog: () => void
}>((set) => ({
  editingBacklog: false,
  addingToList: '',
  addingItem: null,
  setAddingToList: (newState: string) => {
    set(() => ({
      addingToList: newState,
    }))
  },
  toggleEditBacklog: () => {
    set((state) => ({
      editingBacklog: !state.editingBacklog,
    }))
  },
  stopEditBacklog: () => {
    set(() => ({
      editingBacklog: false,
    }))
  },
  startEditBacklog: () => {
    set(() => ({
      editingBacklog: true,
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
