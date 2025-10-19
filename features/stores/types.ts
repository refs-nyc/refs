import type { BackdropSlice } from './backdrop'
import type { ImageSlice } from './images'
import type { ItemSlice } from './items'
import type { MessageSlice } from './messages'
import type { UserSlice } from './users'
import type { UserCacheSlice } from './userCache'
import type { FeedSlice } from './feed'
import { Item, Profile } from '@/features/types'
import type { ImagePickerAsset } from 'expo-image-picker'
import type { InteractionGateSlice } from './interactionGate'
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

export type ReferencersSheetApi = {
  closeAsync: () => Promise<void>
  isOpen: () => boolean
}

export type RefPrefillFields = {
  title: string
  url?: string
  image?: string
  meta?: string
}

export type DirectPhotoRefFields = {
  title: string
  image: string
  asset?: ImagePickerAsset | null
  url?: string
  promptContext: string
}

export type UISlice = {
  editingProfile: boolean
  addingToList: string
  addingItem: Item | null
  referencersBottomSheetRef: React.RefObject<BottomSheet>
  referencersSheetApi: ReferencersSheetApi | null
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
  directPhotoSheetVisible: boolean
  directPhotoRefFields: DirectPhotoRefFields | null
  setAddingNewRefTo: (newState: null | 'grid' | 'backlog') => void
  setAddingRefId: (id: string) => void
  setAddingRefPrefill: (fields: RefPrefillFields | null) => void
  setCurrentRefId: (id: string) => void
  setReferencersSheetApi: (api: ReferencersSheetApi | null) => void
  setReferencersContext: (ctx: ReferencersContext) => void
  setAddingToList: (newState: string) => void
  setAddRefPrompt: (prompt: string) => void
  setSelectedPhoto: (photo: string | null) => void
  openDirectPhotoSheet: (fields: DirectPhotoRefFields) => void
  closeDirectPhotoSheet: () => void
  setIsSettingsSheetOpen: (value: boolean) => void
  setSettingsSheetHeight: (value: number) => void
  setIsEditMode: (value: boolean) => void
  stopEditProfile: () => void
  startEditProfile: () => void
  // Background loading state
  isBackgroundLoading: boolean
  setBackgroundLoading: (loading: boolean) => void
  closeActiveBottomSheet: (() => void) | null
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
  // Other Profile Avatar Zoom
  avatarZoomVisible: boolean
  avatarZoomImageUrl: string | null
  openAvatarZoom: (imageUrl: string) => void
  closeAvatarZoom: () => void
  // Remove Ref Sheet (MyProfile)
  removeRefSheetRef: React.RefObject<BottomSheet>
  pendingRefRemoval: { item: any; onMoveToBacklog: () => Promise<void>; onRemove: () => Promise<void> } | null
  setPendingRefRemoval: (data: { item: any; onMoveToBacklog: () => Promise<void>; onRemove: () => Promise<void> } | null) => void
  // Invite link deep linking
  pendingInviteToken: string | null
  setPendingInviteToken: (token: string | null) => void
}

export type StoreSlices = BackdropSlice &
  ImageSlice &
  ItemSlice &
  MessageSlice &
  UserSlice &
  UserCacheSlice &
  FeedSlice &
  UISlice &
  InteractionGateSlice
