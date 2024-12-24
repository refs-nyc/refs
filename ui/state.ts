import { create } from 'zustand'

export const useUIStore = create<{
  editingProfile: boolean
  toggleEditProfile: () => void
}>((set) => ({
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
