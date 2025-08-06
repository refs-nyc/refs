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
  showMagicSheet: boolean
  setShowMagicSheet: (showMagicSheet: boolean) => void
  // Background loading state
  isBackgroundLoading: boolean
  setBackgroundLoading: (loading: boolean) => void
  // Search-related state
  searchMode: boolean
  selectedRefs: string[]
  selectedRefItems: any[]
  cachedSearchResults: any[]
  cachedSearchTitle: string
  cachedSearchSubtitle: string
  cachedRefTitles: string[]
  cachedRefImages: string[]
  closeActiveBottomSheet: (() => void) | null
  isSearchResultsSheetOpen: boolean
  returningFromSearchNavigation: boolean // Track when returning from search navigation
  setSearchMode: (mode: boolean) => void
  setSelectedRefs: (refs: string[]) => void
  setSelectedRefItems: (items: any[]) => void
  setCachedSearchResults: (
    results: any[],
    title: string,
    subtitle: string,
    refTitles?: string[],
    refImages?: string[]
  ) => void
  clearCachedSearchResults: () => void
  setSearchResultsSheetOpen: (open: boolean) => void
  setReturningFromSearchNavigation: (returning: boolean) => void
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
  isBackgroundLoading: false,
  setBackgroundLoading: (loading: boolean) => {
    set(() => ({
      isBackgroundLoading: loading,
    }))
  },
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
  showMagicSheet: false,
  setShowMagicSheet: (showMagicSheet: boolean) => {
    set(() => ({ showMagicSheet }))
  },
  // Search-related state
  searchMode: false,
  selectedRefs: [],
  selectedRefItems: [],
  cachedSearchResults: [],
  cachedSearchTitle: '',
  cachedSearchSubtitle: '',
  cachedRefTitles: [] as string[],
  cachedRefImages: [] as string[],
  closeActiveBottomSheet: null as (() => void) | null,
  isSearchResultsSheetOpen: false,
  returningFromSearchNavigation: false, // Track when returning from search navigation
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
  setCachedSearchResults: (
    results: any[],
    title: string,
    subtitle: string,
    refTitles?: string[],
    refImages?: string[]
  ) => {
    set(() => ({
      cachedSearchResults: results,
      cachedSearchTitle: title,
      cachedSearchSubtitle: subtitle,
      cachedRefTitles: refTitles || [],
      cachedRefImages: refImages || [],
    }))
  },
  clearCachedSearchResults: () => {
    set(() => ({
      cachedSearchResults: [],
      cachedSearchTitle: '',
      cachedSearchSubtitle: '',
      cachedRefTitles: [],
      cachedRefImages: [],
    }))
  },
  setSearchResultsSheetOpen: (open: boolean) => {
    set(() => ({
      isSearchResultsSheetOpen: open,
    }))
  },
  setReturningFromSearchNavigation: (returning: boolean) => {
    set(() => ({
      returningFromSearchNavigation: returning,
    }))
  },
  setCloseActiveBottomSheet: (closeFunction: (() => void) | null) => {
    set(() => ({
      closeActiveBottomSheet: closeFunction,
    }))
  },
})
