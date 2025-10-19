import type {
  StoreSlices,
  UISlice,
  ProfileNavIntent,
  ReferencersSheetApi,
  DirectPhotoRefFields,
} from '@/features/stores/types'
import { Item, Profile } from '@/features/types'
import BottomSheet from '@gorhom/bottom-sheet'
import React from 'react'
import type { StateCreator } from 'zustand'

export const createUISlice: StateCreator<StoreSlices, [], [], UISlice> = (set, get) => ({
  addingToList: '',
  addingItem: null,
  referencersBottomSheetRef: React.createRef(),
  referencersSheetApi: null,
  logoutSheetRef: React.createRef<BottomSheet>(),
  detailsSheetRef: React.createRef<BottomSheet>(),
  detailsItemId: null,
  detailsProfileUsername: null,
  detailsOpenedFromFeed: false,
  communityFormSheetRef: React.createRef<BottomSheet>(),
  communityFormOnAdded: null,
  settingsSheetRef: React.createRef<BottomSheet>(),
  isSettingsSheetOpen: false,
  settingsSheetHeight: 0,
  isEditMode: false,
  currentRefId: '',
  referencersContext: null,
  addRefSheetRef: React.createRef(),
  addingRefId: '',
  addingRefPrefill: null,
  newRefSheetRef: React.createRef(),
  addingNewRefTo: null,
  addRefPrompt: '',
  selectedPhoto: null,
  directPhotoSheetVisible: false,
  directPhotoRefFields: null,
  isBackgroundLoading: false,
  setBackgroundLoading: (loading: boolean) => {
    set(() => ({
      isBackgroundLoading: loading,
    }))
  },
  setAddingNewRefTo: (newState: null | 'grid' | 'backlog') => {
    set((state) => {
      if (newState !== null && state.addingNewRefTo === newState) {
        // Force a toggle so listeners react when trying to reopen the same sheet
        set({ addingNewRefTo: null })
        return { addingNewRefTo: newState }
      }
      return { addingNewRefTo: newState }
    })
  },
  setAddingRefId: (id: string) => {
    set((state) => ({
      addingRefId: id,
      addingRefPrefill: id ? state.addingRefPrefill : null,
    }))
  },
  setAddingRefPrefill: (fields) => {
    set(() => ({
      addingRefPrefill: fields,
    }))
  },
  setReferencersContext: (ctx) => {
    set(() => ({
      referencersContext: ctx,
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
  setReferencersSheetApi: (api: ReferencersSheetApi | null) => {
    set(() => ({
      referencersSheetApi: api,
    }))
  },
  setDetailsSheetData: (data) => {
    set(() => ({
      detailsItemId: data.itemId,
      detailsProfileUsername: data.profileUsername,
      detailsOpenedFromFeed: data.openedFromFeed,
    }))
  },
  clearDetailsSheetData: () => {
    set(() => ({
      detailsItemId: null,
      detailsProfileUsername: null,
      detailsOpenedFromFeed: false,
    }))
  },
  openCommunityFormSheet: (onAdded?: (item: any) => void) => {
    set(() => ({
      communityFormOnAdded: onAdded || null,
    }))
    get().communityFormSheetRef.current?.snapToIndex(0)
  },
  closeCommunityFormSheet: () => {
    set(() => ({
      communityFormOnAdded: null,
    }))
    get().communityFormSheetRef.current?.close()
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
  openDirectPhotoSheet: (fields: DirectPhotoRefFields) => {
    const { directPhotoBackdropAnimatedIndex } = get()
    if (directPhotoBackdropAnimatedIndex) {
      directPhotoBackdropAnimatedIndex.value = 0
    }
    set(() => ({
      directPhotoSheetVisible: true,
      directPhotoRefFields: fields,
    }))
  },
  closeDirectPhotoSheet: () => {
    const { directPhotoBackdropAnimatedIndex } = get()
    if (directPhotoBackdropAnimatedIndex) {
      directPhotoBackdropAnimatedIndex.value = -1
    }
    set(() => ({
      directPhotoSheetVisible: false,
      directPhotoRefFields: null,
    }))
  },
  setIsSettingsSheetOpen: (value: boolean) => {
    set(() => ({
      isSettingsSheetOpen: value,
    }))
  },
  setSettingsSheetHeight: (value: number) => {
    set(() => ({
      settingsSheetHeight: value,
    }))
  },
  setIsEditMode: (value: boolean) => {
    set(() => ({
      isEditMode: value,
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
  closeActiveBottomSheet: null as (() => void) | null,
  setCloseActiveBottomSheet: (closeFunction: (() => void) | null) => {
    set(() => ({
      closeActiveBottomSheet: closeFunction,
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
  setHomePagerIndex: (i: number) => {
    const {
      editingProfile,
      stopEditProfile,
      stopEditing,
      isEditMode,
      setIsEditMode,
      setIsSettingsSheetOpen,
      settingsSheetRef,
    } = get()

    if (editingProfile || isEditMode) {
      stopEditProfile()
      if (typeof stopEditing === 'function') {
        stopEditing()
      }
      setIsEditMode(false)
      setIsSettingsSheetOpen(false)
      settingsSheetRef.current?.close?.()
    }

    set(() => ({ homePagerIndex: i }))
  },
  profileNavIntent: null,
  setProfileNavIntent: (intent: ProfileNavIntent | null) => set(() => ({ profileNavIntent: intent })),
  consumeProfileNavIntent: (): ProfileNavIntent | null => {
    const intent = get().profileNavIntent
    set(() => ({ profileNavIntent: null }))
    return intent
  },
  directoriesFilterTab: 'popular',
  setDirectoriesFilterTab: (tab: 'popular' | 'people') => set(() => ({ directoriesFilterTab: tab })),
  dmComposerTarget: null,
  dmComposerInitialConversationId: null,
  dmComposerOnSuccess: null,
  openDMComposer: (
    target: Profile,
    options?: { onSuccess?: (target: Profile) => void; conversationId?: string }
  ) => {
    set(() => ({
      dmComposerTarget: target,
      dmComposerInitialConversationId: options?.conversationId ?? null,
      dmComposerOnSuccess: options?.onSuccess ?? null,
    }))
  },
  closeDMComposer: () => {
    set(() => ({
      dmComposerTarget: null,
      dmComposerInitialConversationId: null,
      dmComposerOnSuccess: null,
    }))
  },
  groupComposerTargets: [],
  groupComposerOnSuccess: null,
  openGroupComposer: (targets, options) => {
    const deduped = targets.reduce<Profile[]>((acc, target) => {
      if (!target?.id) return acc
      if (acc.some((existing) => existing.id === target.id)) return acc
      acc.push(target)
      return acc
    }, [])

    set(() => ({
      groupComposerTargets: deduped,
      groupComposerOnSuccess: options?.onSuccess ?? null,
    }))
  },
  closeGroupComposer: () => {
    set(() => ({
      groupComposerTargets: [],
      groupComposerOnSuccess: null,
    }))
  },
  removeInterestSheetRef: React.createRef<BottomSheet>(),
  pendingInterestRemoval: null,
  setPendingInterestRemoval: (data) => {
    set(() => ({
      pendingInterestRemoval: data,
    }))
  },
  notificationPromptSheetRef: React.createRef<BottomSheet>(),
  notificationPromptMessage: null,
  setNotificationPromptMessage: (message) => {
    set(() => ({
      notificationPromptMessage: message,
    }))
  },
  toast: null,
  showToast: (message: string) => {
    const id = Date.now()
    set(() => ({
      toast: { id, message },
    }))
  },
  clearToast: () => {
    set(() => ({ toast: null }))
  },
  // Other Profile Avatar Zoom
  avatarZoomVisible: false,
  avatarZoomImageUrl: null,
  openAvatarZoom: (imageUrl: string) => {
    set(() => ({
      avatarZoomVisible: true,
      avatarZoomImageUrl: imageUrl,
    }))
  },
  closeAvatarZoom: () => {
    set(() => ({
      avatarZoomVisible: false,
      avatarZoomImageUrl: null,
    }))
  },
  // Remove Ref Sheet (MyProfile)
  removeRefSheetRef: React.createRef<BottomSheet>(),
  pendingRefRemoval: null,
  setPendingRefRemoval: (data) => {
    set(() => ({
      pendingRefRemoval: data,
    }))
  },
  // Invite link deep linking
  pendingInviteToken: null,
  setPendingInviteToken: (token: string | null) => {
    set(() => ({
      pendingInviteToken: token,
    }))
  },
})
