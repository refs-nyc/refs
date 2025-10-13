import type { BackdropSlice } from './backdrop'
import type { ImageSlice } from './images'
import type { ItemSlice } from './items'
import type { MessageSlice } from './messages'
import type { UserSlice } from './users'
import type { UserCacheSlice } from './userCache'
import type { FeedSlice } from './feed'
import { Item, Profile } from '@/features/types'
import BottomSheet from '@gorhom/bottom-sheet'
import React from 'react'

export type ProfileNavIntent = {
  targetPagerIndex: 0 | 1 | 2
  directoryFilter?: 'popular' | 'people'
  source?: 'directory' | 'wantToMeet' | 'messages' | 'other' | 'back-fallback'
  animate?: boolean
}

export type ReferencersContext =
  | {
      type: 'community'
      refId: string
      title?: string
      isSubscribed: boolean
      onAdd?: () => Promise<void>
      creator?: Profile | null
    }
  | null

export type RefPrefillFields = {
  title: string
  url?: string
  image?: string
  meta?: string
}

export type UISlice = {
  editingProfile: boolean
  addingToList: string
  addingItem: Item | null
  referencersBottomSheetRef: React.RefObject<BottomSheet>
  currentRefId: string
  addRefSheetRef: React.RefObject<BottomSheet>
  addingRefId: string
  addingRefPrefill: RefPrefillFields | null
  newRefSheetRef: React.RefObject<BottomSheet>
  settingsSheetRef: React.RefObject<BottomSheet>
  isSettingsSheetOpen: boolean
  settingsSheetHeight: number
  isEditMode: boolean
  addingNewRefTo: null | 'grid' | 'backlog'
  addRefPrompt: string
  referencersContext: ReferencersContext
  selectedPhoto: string | null
  setAddingNewRefTo: (newState: null | 'grid' | 'backlog') => void
  setAddingRefId: (id: string) => void
  setAddingRefPrefill: (fields: RefPrefillFields | null) => void
  setCurrentRefId: (id: string) => void
  setReferencersContext: (ctx: ReferencersContext) => void
  setAddingToList: (newState: string) => void
  setAddRefPrompt: (prompt: string) => void
  setSelectedPhoto: (photo: string | null) => void
  setIsSettingsSheetOpen: (value: boolean) => void
  setSettingsSheetHeight: (value: number) => void
  setIsEditMode: (value: boolean) => void
  stopEditProfile: () => void
  startEditProfile: () => void
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
  setCachedSearchResults: (results: any[], title: string, subtitle: string, refTitles?: string[], refImages?: string[]) => void
  clearCachedSearchResults: () => void
  setSearchResultsSheetOpen: (open: boolean) => void
  setReturningFromSearchNavigation: (returning: boolean) => void
  setCloseActiveBottomSheet: (closeFunction: (() => void) | null) => void
  logoutSheetRef: React.RefObject<BottomSheet>
  // Profile Details Sheet
  detailsSheetRef: React.RefObject<BottomSheet>
  detailsItemId: string | null
  detailsProfileUsername: string | null
  detailsOpenedFromFeed: boolean
  setDetailsSheetData: (data: { itemId: string; profileUsername: string; openedFromFeed: boolean }) => void
  clearDetailsSheetData: () => void
  // Community Form Sheet
  communityFormSheetRef: React.RefObject<BottomSheet>
  communityFormOnAdded: ((item: any) => void) | null
  openCommunityFormSheet: (onAdded?: (item: any) => void) => void
  closeCommunityFormSheet: () => void
  // Prompt timing control (session-level)
  hasShownInitialPromptHold: boolean
  setHasShownInitialPromptHold: (shown: boolean) => void
  // Onboarding + navigation coordination
  suppressHomeRedirect: boolean
  setSuppressHomeRedirect: (v: boolean) => void
  justOnboarded: boolean
  setJustOnboarded: (v: boolean) => void
  // Home pager (MyProfile <-> Directories)
  homePagerIndex: number
  setHomePagerIndex: (i: number) => void
  profileNavIntent: ProfileNavIntent | null
  setProfileNavIntent: (intent: ProfileNavIntent | null) => void
  consumeProfileNavIntent: () => ProfileNavIntent | null
  directoriesFilterTab: 'popular' | 'people'
  setDirectoriesFilterTab: (tab: 'popular' | 'people') => void
  dmComposerTarget: Profile | null
  dmComposerInitialConversationId: string | null
  dmComposerOnSuccess: ((target: Profile) => void) | null
  openDMComposer: (target: Profile, options?: { onSuccess?: (target: Profile) => void; conversationId?: string }) => void
  closeDMComposer: () => void
  groupComposerTargets: Profile[]
  groupComposerOnSuccess: ((context: { conversationId: string; title: string }) => void) | null
  openGroupComposer: (targets: Profile[], options?: {
    onSuccess?: (context: { conversationId: string; title: string }) => void
  }) => void
  closeGroupComposer: () => void
  // Remove Interest Sheet
  removeInterestSheetRef: React.RefObject<BottomSheet>
  pendingInterestRemoval: { item: any; isOwner: boolean; title: string; onConfirm: () => void } | null
  setPendingInterestRemoval: (data: { item: any; isOwner: boolean; title: string; onConfirm: () => void } | null) => void
  // Notification Prompt Sheet
  notificationPromptSheetRef: React.RefObject<BottomSheet>
  notificationPromptMessage: string | null
  setNotificationPromptMessage: (message: string | null) => void
  // Global toast notifications
  toast: { id: number; message: string } | null
  showToast: (message: string) => void
  clearToast: () => void
}

export type StoreSlices = BackdropSlice &
  ImageSlice &
  ItemSlice &
  MessageSlice &
  UserSlice &
  UserCacheSlice &
  FeedSlice &
  UISlice
