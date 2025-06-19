import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import BottomSheet from '@gorhom/bottom-sheet'
import React from 'react'
import { create } from 'zustand'

export const useUIStore = create<{
  editingProfile: boolean
  addingToList: string
  addingItem: ItemsRecord | null
  referencersBottomSheetRef: React.RefObject<BottomSheet>
  currentRefId: string
  addRefSheetRef: React.RefObject<BottomSheet>
  addingRefId: string
  setAddingRefId: (id: string) => void
  setCurrentRefId: (id: string) => void
  setAddingToList: (newState: string) => void
  stopEditProfile: () => void
  startEditProfile: () => void
}>((set) => ({
  addingToList: '',
  addingItem: null,
  referencersBottomSheetRef: React.createRef(),
  currentRefId: '',
  addRefSheetRef: React.createRef(),
  addingRefId: '',
  setAddingRefId: (id: string) => {
    set(() => ({
      addingRefId: id,
    }))
  },
  setAddingToList: (newState: string) => {
    set(() => ({
      addingToList: newState,
    }))
  },
  setCurrentRefId: (id: string) => {
    set(() => ({
      currentRefId: id,
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
