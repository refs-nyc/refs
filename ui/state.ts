import type { StoreSlices } from '@/features/stores/types'
import { Item } from '@/features/types'
import BottomSheet from '@gorhom/bottom-sheet'
import React from 'react'
import type { StateCreator } from 'zustand'

export type UISlice = {
  editingProfile: boolean
  addingToList: string
  addingItem: Item | null
  referencersBottomSheetRef: React.RefObject<BottomSheet>
  currentRefId: string
  addRefSheetRef: React.RefObject<BottomSheet>
  addingRefId: string
  newRefSheetRef: React.RefObject<BottomSheet>
  addingNewRefTo: null | 'grid' | 'backlog'
  addRefPrompt: string
  setAddingNewRefTo: (newState: null | 'grid' | 'backlog') => void
  setAddingRefId: (id: string) => void
  setCurrentRefId: (id: string) => void
  setAddingToList: (newState: string) => void
  setAddRefPrompt: (prompt: string) => void
  stopEditProfile: () => void
  startEditProfile: () => void
  // Search-related state
  searchMode: boolean
  selectedRefs: string[]
  selectedRefItems: any[]
  returningFromSearch: boolean
  cachedSearchResults: any[]
  cachedSearchTitle: string
  cachedSearchSubtitle: string
  closeActiveBottomSheet: (() => void) | null,
  isSearchResultsSheetOpen: boolean
  setSearchMode: (mode: boolean) => void
  setSelectedRefs: (refs: string[]) => void
  setSelectedRefItems: (items: any[]) => void
  setReturningFromSearch: (returning: boolean) => void
  setCachedSearchResults: (results: any[], title: string, subtitle: string) => void
  clearCachedSearchResults: () => void
  setSearchResultsSheetOpen: (open: boolean) => void
  setCloseActiveBottomSheet: (closeFunction: (() => void) | null) => void
}

export const createUISlice: StateCreator<StoreSlices, [], [], UISlice> = (set) => ({
  addingToList: '',
  addingItem: null,
  referencersBottomSheetRef: React.createRef(),
  currentRefId: '',
  addRefSheetRef: React.createRef(),
  addingRefId: '',
  newRefSheetRef: React.createRef(),
  addingNewRefTo: null,
  addRefPrompt: '',
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
  // Search-related state
  searchMode: false,
  selectedRefs: [],
  selectedRefItems: [],
  returningFromSearch: false,
  cachedSearchResults: [],
  cachedSearchTitle: '',
  cachedSearchSubtitle: '',
  closeActiveBottomSheet: null as (() => void) | null,
  isSearchResultsSheetOpen: false,
  setSearchMode: (mode: boolean) => {
    set(() => ({
      searchMode: mode,
    }))
  },
  setSelectedRefs: (refs: string[]) => {
    set(() => ({
      selectedRefs: refs,
    }))
  },
  setSelectedRefItems: (items: any[]) => {
    set(() => ({
      selectedRefItems: items,
    }))
  },
  setReturningFromSearch: (returning: boolean) => {
    set(() => ({
      returningFromSearch: returning,
    }))
  },
  setCachedSearchResults: (results: any[], title: string, subtitle: string) => {
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
  setSearchResultsSheetOpen: (open: boolean) => {
    set(() => ({
      isSearchResultsSheetOpen: open,
    }))
  },
  setCloseActiveBottomSheet: (closeFunction: (() => void) | null) => {
    set(() => ({
      closeActiveBottomSheet: closeFunction,
    }))
  },
})
