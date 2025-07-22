import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import BottomSheet from '@gorhom/bottom-sheet'
import React from 'react'
import { create } from 'zustand'
import { PersonResult } from '@/features/pocketbase/api/search'

export const useUIStore = create<{
  editingProfile: boolean
  addingToList: string
  addingItem: ItemsRecord | null
  referencersBottomSheetRef: React.RefObject<BottomSheet>
  currentRefId: string
  addRefSheetRef: React.RefObject<BottomSheet>
  addingRefId: string
  newRefSheetRef: React.RefObject<BottomSheet>
  addingNewRefTo: null | 'grid' | 'backlog'
  addRefPrompt: string
  returningFromSearch: boolean
  selectedRefs: string[]
  cachedSearchResults: PersonResult[]
  cachedSearchTitle: string
  cachedSearchSubtitle: string
  setAddingNewRefTo: (newState: null | 'grid' | 'backlog') => void
  setAddingRefId: (id: string) => void
  setCurrentRefId: (id: string) => void
  setAddingToList: (newState: string) => void
  setAddRefPrompt: (prompt: string) => void
  setReturningFromSearch: (value: boolean) => void
  setSelectedRefs: (refs: string[]) => void
  setCachedSearchResults: (results: PersonResult[], title: string, subtitle: string) => void
  clearCachedSearchResults: () => void
  stopEditProfile: () => void
  startEditProfile: () => void
}>((set) => ({
  addingToList: '',
  addingItem: null,
  referencersBottomSheetRef: React.createRef(),
  currentRefId: '',
  addRefSheetRef: React.createRef(),
  addingRefId: '',
  newRefSheetRef: React.createRef(),
  addingNewRefTo: null,
  addRefPrompt: '',
  returningFromSearch: false,
  selectedRefs: [],
  cachedSearchResults: [],
  cachedSearchTitle: '',
  cachedSearchSubtitle: '',
  setAddingNewRefTo: (newState: null | 'grid' | 'backlog') => {
    set(() => ({
      addingNewRefTo: newState,
    }))
  },
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
  setAddRefPrompt: (prompt: string) => {
    set(() => ({
      addRefPrompt: prompt,
    }))
  },
  setReturningFromSearch: (value: boolean) => {
    set(() => ({
      returningFromSearch: value,
    }))
  },
  setSelectedRefs: (refs: string[]) => {
    set(() => ({
      selectedRefs: refs,
    }))
  },
  setCachedSearchResults: (results: PersonResult[], title: string, subtitle: string) => {
    set(() => ({
      cachedSearchResults: results,
      cachedSearchTitle: title,
      cachedSearchSubtitle: subtitle,
    }))
  },
  clearCachedSearchResults: () => {
    set(() => ({
      cachedSearchResults: [],
      cachedSearchTitle: '',
      cachedSearchSubtitle: '',
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
