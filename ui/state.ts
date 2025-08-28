import type { StoreSlices, UISlice } from '@/features/stores/types'
import { Item } from '@/features/types'
import BottomSheet from '@gorhom/bottom-sheet'
import React from 'react'
import type { StateCreator } from 'zustand'

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
  selectedPhoto: null,
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
  setSelectedPhoto: (photo: string | null) => {
    set(() => ({
      selectedPhoto: photo,
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
  setCachedSearchResults: (results: any[], title: string, subtitle: string, refTitles?: string[], refImages?: string[]) => {
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
  // Logout button visibility
  showLogoutButton: false,
  setShowLogoutButton: (show: boolean) => {
    set(() => ({
      showLogoutButton: show,
    }))
  },
  // Prompt timing control (session-level)
  hasShownInitialPromptHold: false,
  setHasShownInitialPromptHold: (shown: boolean) => {
    set(() => ({ hasShownInitialPromptHold: shown }))
  },
  // Onboarding + navigation coordination
  suppressHomeRedirect: false,
  setSuppressHomeRedirect: (v: boolean) => set(() => ({ suppressHomeRedirect: v })),
  justOnboarded: false,
  setJustOnboarded: (v: boolean) => set(() => ({ justOnboarded: v })),
  // Home pager (MyProfile <-> Directories)
  homePagerIndex: 0,
  setHomePagerIndex: (i: number) => set(() => ({ homePagerIndex: i })),
  returnToDirectories: false,
  setReturnToDirectories: (v: boolean) => set(() => ({ returnToDirectories: v })),
})
