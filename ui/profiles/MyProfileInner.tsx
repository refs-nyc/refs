console.time('[profile] module-top')

import * as React from 'react'
import { useAppStore } from '@/features/stores'
import type { Profile } from '@/features/types'
import { ExpandedItem } from '@/features/types'
import { s, c } from '@/features/style'
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { useShareIntentContext } from 'expo-share-intent'
import { useRef, useState, useMemo, useCallback } from 'react'
import type { DependencyList } from 'react'
import { ScrollView, View, Text, Pressable, Keyboard, ActivityIndicator, useWindowDimensions, Alert } from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import FloatingJaggedButton from '../buttons/FloatingJaggedButton'
import { DEFAULT_TILE_SIZE } from '../grid/GridTile'
import { Grid } from '../grid/Grid'
import { Button } from '../buttons/Button'
import Ionicons from '@expo/vector-icons/Ionicons'
import Svg, { Circle, G, Path } from 'react-native-svg'

import { Heading } from '../typo/Heading'
import { MyBacklogSheet } from './sheets/MyBacklogSheet'
import { RefForm } from '../actions/RefForm'
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { Animated as RNAnimated, Easing as RNEasing } from 'react-native'
import { Collections } from '@/features/pocketbase/pocketbase-types'
import { getSnapshot, snapshotKeys } from '@/features/cache/snapshotStore'
import { pinataUpload } from '@/features/pinata'
import { Picker } from '@/ui/inputs/Picker'
import { enqueueIdleTask } from '@/features/utils/idleQueue'
import type { IdleTaskHandle } from '@/features/utils/idleQueue'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchProfileData,
  profileKeys,
  ProfileData,
  extractProfileHeader,
  persistProfileHeaderSnapshot,
} from '@/features/queries/profile'
import {
  getProfileSnapshotByUserName,
  getProfileCacheEntryByUserName,
  upsertProfileCacheEntry,
  updateProfileCacheEntry,
  loadProfileSnapshotFromStorage,
  writeProfileSnapshot,
} from '@/features/cache/profileCache'

const PERF = process.env.EXPO_PUBLIC_PERF_HARNESS === '1'
const _useEffect = React.useEffect
const _useLayoutEffect = React.useLayoutEffect

if (PERF && process.env.EXPO_PUBLIC_NO_EFFECTS === '1') {
  // @ts-ignore
  React.useEffect = (fn: any, deps: any) => _useEffect(() => {}, deps)
  // @ts-ignore
  React.useLayoutEffect = (fn: any, deps: any) => _useLayoutEffect(() => {}, deps)
}

const RenderTimer: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  console.time(label)
  try {
    return <>{children}</>
  } finally {
    console.timeEnd(label)
  }
}

console.timeEnd('[profile] module-top')

type ProfileSnapshot = ProfileData

const PERF_TRACE = PERF
const logProfilePerf = (label: string, startedAt: number) => {
  if (!PERF_TRACE) return
  const duration = Date.now() - startedAt
  console.log(`[profile][perf] ${label} ${duration}ms`)
}

const effectRunCounts = new Map<string, number>()
const useProfileEffect = (
  name: string,
  effect: () => void | (() => void),
  deps: DependencyList
) => {
  React.useEffect(() => {
    if (!PERF_TRACE) {
      return effect()
    }

    const runIndex = effectRunCounts.get(name) ?? 0
    effectRunCounts.set(name, runIndex + 1)

    let stack: string[] | undefined
    if (runIndex === 0) {
      stack = new Error().stack?.split('\n').slice(1, 5)
      console.log(`[profile][perf] effect:start ${name}`, stack)
    }

    const startedAt = Date.now()

    try {
      const cleanup = effect()
      const duration = Date.now() - startedAt
      if (runIndex === 0 || duration >= 10) {
        console.log(`[profile][perf] effect:end ${name} ${duration}ms run=${runIndex}`)
      }
      if (typeof cleanup === 'function') {
        return () => {
          cleanup()
        }
      }
      return cleanup
    } catch (error) {
      const duration = Date.now() - startedAt
      console.warn(`[profile][perf] effect:error ${name} ${duration}ms run=${runIndex}`, error)
      throw error
    }
  }, deps)
}

const gridAnimationHistory = new Set<string>()

type PromptSuggestion = {
  text: string
  photoPath?: boolean
  cameraPath?: boolean
}

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  { text: 'Link you shared recently' },
  { text: 'Free space' },
  { text: 'Example of perfect design' },
  { text: 'Nascent hobby' },
  { text: 'Most-rewatched movie' },
  { text: 'Neighborhood spot' },
  { text: 'What you put on aux' },
  { text: 'Rabbit hole' },
  { text: 'A preferred publication' },
  { text: 'Something on your reading list' },
  { text: 'A tool you actually love using' },
  { text: 'Piece from a museum', photoPath: true },
  { text: 'Tradition you love', photoPath: true },
  { text: 'Meme', photoPath: true },
  { text: 'Halloween pic', photoPath: true },
  { text: 'Favorite view', photoPath: true },
  { text: "Material you're drawn to", photoPath: true },
  { text: 'Someone who shaped your taste', photoPath: true },
  { text: 'Ritual that grounds you', photoPath: true },
  { text: 'Sense of style in a single pic', photoPath: true },
  { text: 'From a day you felt alive', photoPath: true },
  { text: 'When the gang looked beautiful', photoPath: true },
  { text: "Quietest place you've been", photoPath: true },
  { text: 'Evidence of a good time', photoPath: true },
  { text: 'Something you screenshotted', photoPath: true },
  { text: 'Photo of a project mid-life', photoPath: true },
  { text: 'A street corner', photoPath: true },
  { text: 'Personal website/twitter', photoPath: true },
  { text: 'Coolest thing in your immediate vicinity', cameraPath: true },
]

const PROMPT_BATCH_SIZE = 6

const PROFILE_FORCE_REFRESH_THRESHOLD_MS = 3 * 60 * 1000

const profileForceRefreshTimestamps = new Map<string, number>()

const shufflePromptList = (source: PromptSuggestion[]) => {
  const shuffled = [...source]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const createPromptBatch = (size = PROMPT_BATCH_SIZE, excludeTexts?: Set<string>) => {
  const skip = excludeTexts ? new Set(excludeTexts) : new Set<string>()
  const shuffled = shufflePromptList(PROMPT_SUGGESTIONS)
  const batch: PromptSuggestion[] = []

  for (const suggestion of shuffled) {
    if (skip.has(suggestion.text)) continue
    batch.push(suggestion)
    skip.add(suggestion.text)
    if (batch.length === size) break
  }

  return batch
}

const PROMPT_CARD_BACKGROUNDS = [c.white, c.surface, c.surface2, c.accent2]
const PROMPT_CARD_ROTATIONS = [-2.25, -0.5, 1, 2.75]
const AVATAR_SIZE = 61.2
const AVATAR_PLACEHOLDER_BORDER = '#B0B0B0'

export const MyProfile = ({ userName }: { userName: string }) => {
  const { hasShareIntent } = useShareIntentContext()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  const cachedSnapshot = getProfileSnapshotByUserName(userName)
  const [hydraulicCache, setHydraulicCache] = useState<ProfileSnapshot | undefined>(() => cachedSnapshot)

  const [profile, setProfile] = useState<Profile | undefined>(hydraulicCache?.profile)
  const [gridItems, setGridItems] = useState<ExpandedItem[]>(hydraulicCache?.gridItems ?? [])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>(hydraulicCache?.backlogItems ?? [])
  const [loading, setLoading] = useState(!hydraulicCache)
  const [focusReady, setFocusReady] = useState(Boolean(hydraulicCache))

  const user = useAppStore((state) => state.user)

  useProfileEffect('profile.logGridItemsLength', () => {
    if (__DEV__) {
      console.log('[boot-trace] profile.gridItemsLength', userName, gridItems.length)
    }
  }, [gridItems.length, userName])

  const [removingItem, setRemovingItem] = useState<ExpandedItem | null>(null)
  const [optimisticAvatarUri, setOptimisticAvatarUri] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const avatarScale = useRef(new RNAnimated.Value(1)).current
  const avatarSwapOpacity = useRef(new RNAnimated.Value(1)).current
  const bottomSheetRef = useRef<BottomSheet>(null)
  const directPhotoPickerGuardRef = useRef(false)
  const promptTapGuardRef = useRef(0)
  const acceptPromptTap = useCallback(() => {
    const now = Date.now()
    if (now - promptTapGuardRef.current < 150) {
      return false
    }
    promptTapGuardRef.current = now
    return true
  }, [])
  // Get optimistic items from store
  const { optimisticItems, setPendingRefRemoval } = useAppStore()
  const profileRefreshTrigger = useAppStore((state) => state.profileRefreshTrigger)
  const interactionGateActive = useAppStore((state) => state.interactionGateActive)

  const {
    getUserByUserName,
    moveToBacklog,
    removeItem,
    startEditProfile,
    stopEditProfile,
    stopEditing,
    newRefSheetRef,
    settingsSheetRef,
    isSettingsSheetOpen,
    setIsSettingsSheetOpen,
    isEditMode,
    setIsEditMode,
    logout,
    hasShownInitialPromptHold,
    setHasShownInitialPromptHold,
    justOnboarded,
    setJustOnboarded,
    addToProfile,
    removeOptimisticItem,
    updateUser,
    detailsSheetRef,
    setDetailsSheetData,
    homePagerIndex,
    editingProfile,
    openNewRef,
  } = useAppStore()

  const queryClient = useQueryClient()

  const ownProfile = user?.userName === userName
  // For own profile, always prefer global user state (source of truth)
  // For other profiles, rely on fetched profile or cached data
  const effectiveProfile = ownProfile ? (user ?? profile) : profile
  const hasProfile = Boolean(effectiveProfile)

  const profileUserId = useMemo(() => {
    if (ownProfile && user?.id) return user.id
    if (profile?.id) return profile.id
    if (hydraulicCache?.profile.id) return hydraulicCache.profile.id
    const cachedEntry = getProfileCacheEntryByUserName(userName)
    return cachedEntry?.profile.id
  }, [ownProfile, user?.id, profile?.id, hydraulicCache?.profile.id, userName])

  if (PERF_TRACE) {
    const queryClientAny = queryClient as unknown as {
      setQueryData: typeof queryClient.setQueryData
      __profileRQPatched?: boolean
    }
    if (!queryClientAny.__profileRQPatched) {
      const originalSet = queryClientAny.setQueryData.bind(queryClientAny)
      queryClientAny.__profileRQPatched = true
      const patchedSetQueryData: typeof queryClientAny.setQueryData = (...args) => {
        const key = args[0]
        const value = args[1]

        const approxSize = (() => {
          try {
            const json = JSON.stringify(value)
            return json ? json.length : -1
          } catch (error) {
            return -1
          }
        })()

        let keyString: string | undefined
        try {
          keyString = JSON.stringify(key)
        } catch (error) {
          keyString = undefined
        }

        if (keyString?.includes('"profile"') && approxSize > 80_000) {
          console.warn('[RQ HEAVY WRITE]', key, 'size≈', approxSize)
        }

        return originalSet(...args)
      }

      queryClientAny.setQueryData = patchedSetQueryData
    }
  }

  const applyProfileData = useCallback(
    (payload: ProfileData, { persist = true }: { persist?: boolean } = {}) => {
      const applyStartedAt = PERF_TRACE ? Date.now() : 0
      if (PERF_TRACE) {
        console.log('[profile][perf] applyProfileData:start', {
          grid: payload.gridItems.length,
          backlog: payload.backlogItems.length,
        })
      }
      const header = extractProfileHeader(payload.profile)
      queryClient.setQueryData(profileKeys.header(userName), header)
      setProfile(payload.profile)
      setGridItems(payload.gridItems)
      setBacklogItems(payload.backlogItems)
      useAppStore.getState().setGridItemCount(payload.gridItems.length)

      if (PERF_TRACE) {
        const rqStartedAt = Date.now()
        queryClient.setQueryData<ProfileData>(profileKeys.grid(payload.profile.id), payload)
        logProfilePerf('applyProfileData.setQueryData', rqStartedAt)
      } else {
        queryClient.setQueryData<ProfileData>(profileKeys.grid(payload.profile.id), payload)
      }

      if (persist) {
        const userId = payload.profile.id
        if (userId) {
          void persistProfileHeaderSnapshot(userId, header)
          const snapshotStartedAt = PERF_TRACE ? Date.now() : 0
          const writePromise = writeProfileSnapshot({
            userId,
            userName: payload.profile.userName,
            profile: payload.profile,
            gridItems: payload.gridItems,
            backlogItems: payload.backlogItems,
            updatedAt: Date.now(),
          })
          if (PERF_TRACE) {
            writePromise
              .then(() => {
                logProfilePerf('applyProfileData.writeProfileSnapshot', snapshotStartedAt)
              })
              .catch((error) => {
                console.warn('Profile snapshot write failed', error)
                logProfilePerf('applyProfileData.writeProfileSnapshot.error', snapshotStartedAt)
              })
          } else {
            writePromise.catch((error) => {
              console.warn('Profile snapshot write failed', error)
            })
          }
          void writePromise
        }
      } else if (payload.profile.id) {
        upsertProfileCacheEntry(payload.profile.id, payload.profile.userName, payload)
      }
      if (PERF_TRACE) {
        logProfilePerf('applyProfileData.total', applyStartedAt)
      }
    },
    [queryClient, userName]
  )

  useProfileEffect('profile.cacheHydrate', () => {
    let cancelled = false

    const hydrateFromMemory = () => {
      const startedAt = PERF_TRACE ? Date.now() : 0
      const snapshot = getProfileSnapshotByUserName(userName)
      if (!snapshot) {
        return false
      }
      if (PERF_TRACE) {
        logProfilePerf('hydrateFromMemory.snapshot', startedAt)
      }
      applyProfileData(snapshot, { persist: false })
      setHydraulicCache(snapshot)
      setLoading(false)
      if (PERF_TRACE) {
        logProfilePerf('hydrateFromMemory.total', startedAt)
      }
      return true
    }

    const hydrateFromQuery = () => {
      if (!profileUserId) {
        return false
      }
      const startedAt = PERF_TRACE ? Date.now() : 0
      const cached = queryClient.getQueryData<ProfileData>(profileKeys.grid(profileUserId))
      if (!cached) {
        return false
      }
      if (PERF_TRACE) {
        logProfilePerf('hydrateFromQuery.snapshot', startedAt)
      }
      applyProfileData(cached, { persist: false })
      setHydraulicCache(cached)
      setLoading(false)
      if (PERF_TRACE) {
        logProfilePerf('hydrateFromQuery.total', startedAt)
      }
      return true
    }

    const hydrate = async () => {
      if (hydrateFromMemory() || hydrateFromQuery()) {
        return
      }

      if (user?.id) {
        try {
          const compactStart = PERF_TRACE ? Date.now() : 0
          const compact = await loadProfileSnapshotFromStorage({ userId: user.id, userName })
          if (PERF_TRACE) {
            logProfilePerf('hydrateFromCompact.read', compactStart)
          }
          if (cancelled) return
          if (compact) {
            applyProfileData(compact, { persist: false })
            setHydraulicCache(compact)
            setLoading(false)
            return
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[boot-trace] hydrateFromCompact failed', error)
          }
        }
      }

      setHydraulicCache(undefined)
      setProfile(undefined)
      setGridItems([])
      setBacklogItems([])
      setFocusReady(false)
      setLoading(true)

      if (!user?.id) {
        return
      }

      const shouldTimeSnapshot = PERF_TRACE
      if (shouldTimeSnapshot) {
        console.time('[profile] snapshot->apply')
      }

      try {
        const snapshotStartedAt = PERF_TRACE ? Date.now() : 0
        const snapshot = await getSnapshot('profileSelf', snapshotKeys.profileSelf(user.id))
        if (PERF_TRACE) {
          logProfilePerf('hydrateFromAsync.getSnapshot', snapshotStartedAt)
        }
        if (cancelled) return

        if (snapshot?.data) {
          if (PERF_TRACE) {
            console.log('[profile][perf] hydrateFromAsync.snapshotSize', {
              grid: snapshot.data.gridItems.length,
              backlog: snapshot.data.backlogItems.length,
            })
          }
          applyProfileData(snapshot.data, { persist: false })
          setHydraulicCache(snapshot.data)
          setLoading(false)
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[boot-trace] profile.cacheHydrate failed', error)
        }
      } finally {
        if (shouldTimeSnapshot) {
          try {
            console.timeEnd('[profile] snapshot->apply')
          } catch {
            // Ignore timer errors from duplicate ends.
          }
        }
      }
    }

    hydrate().catch((error) => {
      if (__DEV__) {
        console.warn('[boot-trace] profile.cacheHydrate outer failed', error)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user?.id, userName, profileUserId, queryClient, applyProfileData])

  useProfileEffect('profile.cleanupEditMode', () => {
    return () => {
      setIsEditMode(false)
      stopEditProfile()
    }
  }, [stopEditProfile])

  useProfileEffect('profile.openRemoveRefSheet', () => {
    if (!removingItem) return
    
    const handleMoveToBacklog = async () => {
      try {
        const { optimisticItems, removeOptimisticItem, decrementGridItemCount } = useAppStore.getState()
        
        const isOptimistic = removingItem.id.startsWith('temp-') || optimisticItems.has(removingItem.id)
        
        if (isOptimistic) {
          removeOptimisticItem(removingItem.id)
          decrementGridItemCount()
        } else {
          setGridItems(prev => prev.filter(item => item.id !== removingItem.id))
          decrementGridItemCount()

          updateProfileCache((current) => ({
            ...current,
            gridItems: current.gridItems.filter((item) => item.id !== removingItem.id),
          }))

          ;(async () => {
            try {
              await moveToBacklog(removingItem.id)
              invalidateProfile()
            } catch (error) {
              console.error('Failed to move item to backlog:', error)
              invalidateProfile()
            }
          })()
        }
        
        setRemovingItem(null)
      } catch (error) {
        console.error(error)
      }
    }

    const handleRemoveFromProfile = async () => {
      const { optimisticItems, removeOptimisticItem, decrementGridItemCount } = useAppStore.getState()
      
      const isOptimistic = removingItem.id.startsWith('temp-') || optimisticItems.has(removingItem.id)
      
      if (isOptimistic) {
        removeOptimisticItem(removingItem.id)
        decrementGridItemCount()
      } else {
        setGridItems(prev => prev.filter(item => item.id !== removingItem.id))
        decrementGridItemCount()

        updateProfileCache((current) => ({
          ...current,
          gridItems: current.gridItems.filter((item) => item.id !== removingItem.id),
        }))

        ;(async () => {
          try {
            await removeItem(removingItem.id)
            invalidateProfile()
          } catch (error) {
            console.error('Failed to remove item:', error)
            invalidateProfile()
          }
        })()
      }
      
      setRemovingItem(null)
    }

    setPendingRefRemoval({
      item: removingItem,
      onMoveToBacklog: handleMoveToBacklog,
      onRemove: handleRemoveFromProfile,
    })
  }, [removingItem, setPendingRefRemoval])
  const closeSettingsSheet = useCallback(
    ({ afterClose }: { exitEditMode?: boolean; afterClose?: () => void } = {}) => {
      setIsSettingsSheetOpen(false)
      settingsSheetRef.current?.close()
      afterClose?.()
    },
    [settingsSheetRef, setIsSettingsSheetOpen]
  )

  const enterEditMode = useCallback(() => {
    if (isEditMode) {
      return
    }

    setIsEditMode(true)
    startEditProfile()
  }, [isEditMode, setIsEditMode, startEditProfile])

  const openSettingsSheet = useCallback(() => {
    setIsSettingsSheetOpen(true)
    settingsSheetRef.current?.snapToIndex(0)
  }, [settingsSheetRef, setIsSettingsSheetOpen])

  const exitEditMode = useCallback(() => {
    if (!isEditMode) return
    settingsSheetRef.current?.close()
    setIsSettingsSheetOpen(false)
    setIsEditMode(false)
    stopEditProfile()
    stopEditing()
  }, [isEditMode, setIsEditMode, settingsSheetRef, stopEditProfile, stopEditing])

  useProfileEffect('profile.exitEditOnPageChange', () => {
    if (homePagerIndex !== 0 && (isEditMode || editingProfile)) {
      exitEditMode()
    }
  }, [homePagerIndex, isEditMode, editingProfile, exitEditMode])

  const displayName = useMemo(() => {
    if (!effectiveProfile) return userName
    const first = (effectiveProfile.firstName || '').trim()
    const last = (effectiveProfile.lastName || '').trim()
    const combined = `${first} ${last}`.trim()
    if (combined) return combined
    const fallback = (effectiveProfile.name || '').trim()
    return fallback || effectiveProfile.userName || userName
  }, [effectiveProfile, userName])
  const locationLabel = (effectiveProfile?.location || '').trim()
  const remoteAvatar = effectiveProfile?.image || (effectiveProfile as any)?.avatar_url || ''
  const avatarUri = optimisticAvatarUri ?? remoteAvatar ?? ''

  // Combine grid items with optimistic items for display
  const displayGridItems = useMemo(() => {
    // Early return if no optimistic items
    if (optimisticItems.size === 0) {
      return gridItems
    }
    
    // Create a Set of existing grid item IDs for O(1) lookup
    const gridItemIds = new Set(gridItems.map(item => item.id))
    
    // Filter out optimistic items that already exist in grid items
    const filteredOptimisticItems = Array.from(optimisticItems.values()).filter(optimisticItem =>
      !gridItemIds.has(optimisticItem.id)
    )
    
    // Only create new array if we actually have optimistic items to add
    if (filteredOptimisticItems.length === 0) {
      return gridItems
    }
    
    // Use a stable reference to prevent unnecessary re-renders
    return [...gridItems, ...filteredOptimisticItems]
  }, [gridItems, optimisticItems.size]) // Only depend on size, not the actual objects

  const animatedItemsRef = useRef<Set<string>>(new Set())
  const prevOptimisticIdsRef = useRef<string[]>([])

  // Track newly added optimistic items for animation
  useProfileEffect('profile.trackOptimisticItems', () => {
    const currentIds = Array.from(optimisticItems.keys())
    const previousIds = prevOptimisticIdsRef.current
    prevOptimisticIdsRef.current = currentIds

    if (currentIds.length === 0) {
      return
    }

    const gridItemIds = new Set(gridItems.map((item) => item.id))
    const newIds = currentIds.filter((id) => !previousIds.includes(id))

    if (newIds.length === 0) {
      return
    }

    let candidateId: string | null = null
    for (let index = newIds.length - 1; index >= 0; index -= 1) {
      const id = newIds[index]
      if (gridItemIds.has(id)) continue
      if (animatedItemsRef.current.has(id)) continue
      candidateId = id
      break
    }

    if (!candidateId) {
      return
    }

    animatedItemsRef.current.add(candidateId)
    setNewlyAddedItemId(candidateId)

    const timer = setTimeout(() => {
      setNewlyAddedItemId(null)
    }, 500)

    return () => clearTimeout(timer)
  }, [optimisticItems, gridItems])

  // Remove optimistic items when real items are confirmed
  useProfileEffect('profile.cleanupOptimisticItems', () => {
    if (optimisticItems.size === 0 || gridItems.length === 0) return
    
    const optimisticItemsArray = Array.from(optimisticItems.values())
    const gridItemIds = new Set(gridItems.map(item => item.id))
    
    // Find optimistic items that now have real counterparts
    const confirmedOptimisticItems = optimisticItemsArray.filter(item => 
      gridItemIds.has(item.id)
    )
    
    // Remove confirmed optimistic items
    confirmedOptimisticItems.forEach(item => {
      removeOptimisticItem(item.id)
    })
  }, [gridItems, optimisticItems.size])

  // Keep optimistic refs around between submissions so grid tiles stay visible;
  // no cleanup on size changes so in-flight items persist while uploads finish.

  const [newlyAddedItemId, setNewlyAddedItemId] = useState<string | null>(null)
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>(() => createPromptBatch())
  const GRID_ROWS = 4
  const GRID_COLUMNS = 3
  const GRID_ROW_GAP = (s.$075 as number) + 5
  const GRID_HEIGHT = GRID_ROWS * DEFAULT_TILE_SIZE + (GRID_ROWS - 1) * GRID_ROW_GAP
  const GRID_CAPACITY = GRID_ROWS * GRID_COLUMNS
  const shareIntentHandledRef = useRef(false)

  // Avatar interaction handlers - must be defined before headerContent
  const bounceAvatar = useCallback(() => {
    RNAnimated.sequence([
      RNAnimated.spring(avatarScale, {
        toValue: 0.9,
        damping: 14,
        stiffness: 180,
        useNativeDriver: true,
      }),
      RNAnimated.spring(avatarScale, {
        toValue: 1,
        damping: 14,
        stiffness: 220,
        useNativeDriver: true,
      }),
    ]).start()
  }, [avatarScale])

  const handleAvatarPress = useCallback(() => {
    console.log('🎯 Avatar pressed!', { ownProfile, avatarUploading })
    if (!ownProfile || avatarUploading) {
      console.log('⚠️ Avatar press blocked:', { ownProfile, avatarUploading })
      return
    }
    bounceAvatar()
    console.log('✅ Opening avatar picker')
    setShowAvatarPicker(true)
  }, [ownProfile, avatarUploading, bounceAvatar])

  const handleAvatarPickerCancel = useCallback(() => {
    setShowAvatarPicker(false)
    setAvatarUploading(false)
  }, [])

  const headerContent = hasProfile ? (
    <View style={{ width: '100%', paddingHorizontal: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
        <View style={{ flex: 1 }}>
      <Text
        style={{
              color: '#030303',
              fontSize: (s.$09 as number) + 4,
          fontFamily: 'System',
              fontWeight: '700',
          lineHeight: s.$1half,
        }}
      >
            {displayName}
      </Text>
          {locationLabel ? (
      <Text
        style={{
          color: c.prompt,
                fontSize: 13,
                fontFamily: 'Inter',
                fontWeight: '500',
          lineHeight: s.$1half,
        }}
      >
              {locationLabel}
      </Text>
          ) : null}
        </View>
        {(() => {
          const outerRingSize = AVATAR_SIZE * 1.1
          const innerRingSize = AVATAR_SIZE
          const avatarNode = (
            <RNAnimated.View style={{ transform: [{ scale: avatarScale }], opacity: avatarSwapOpacity }}>
              <View
                style={{
                  width: outerRingSize,
                  height: outerRingSize,
                  borderRadius: outerRingSize / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.surface,
                  borderWidth: 2.5,
                  borderColor: avatarUri ? '#B0B0B0' : `rgba(128, 128, 128, 0.1)`,
                }}
              >
                <View
                  style={{
                    width: innerRingSize,
                    height: innerRingSize,
                    borderRadius: innerRingSize / 2,
                    borderWidth: 2.5,
                    borderColor: avatarUri ? c.surface : `rgba(128, 128, 128, 0.1)`,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                    borderStyle: avatarUri ? 'solid' : 'dashed',
                  }}
                >
                  {avatarUri ? (
                    <Image
                      source={avatarUri}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <Text style={{ color: c.muted, fontSize: 24, fontWeight: '200', fontFamily: 'Inter' }}>+</Text>
                  )}
                  {avatarUri && avatarUploading && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(242,238,230,0.55)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ActivityIndicator size="small" color={c.olive} />
                    </View>
                  )}
                </View>
                {/* Edit button - duotone style matching FloatingJaggedButton */}
                {ownProfile && !avatarUploading && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isEditMode ? 'Finish editing profile' : 'Edit profile'}
                    onPress={() => {
                      if (isEditMode) {
                        exitEditMode()
                        return
                      }
                      enterEditMode()
                    }}
                    hitSlop={8}
                    style={{
                      position: 'absolute',
                      bottom: -10,
                      right: -12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3,
                      elevation: 3,
                    }}
                  >
                    <Svg width={36} height={36} viewBox="0 0 36 36">
                      {/* Drop shadow circle (offset down) */}
                      <Circle
                        cx={18}
                        cy={18.4}
                        r={16}
                        fill="rgba(0,0,0,0.25)"
                      />
                      {/* White outline ring for 3D effect */}
                      <Circle
                        cx={18}
                        cy={18}
                        r={17}
                        fill="none"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth={1.6}
                      />
                      {/* Outer surface border ring */}
                      <Circle
                        cx={18}
                        cy={18}
                        r={16}
                        fill={c.surface2}
                      />
                      {/* Inner surface circle (main button) */}
                      <Circle
                        cx={18}
                        cy={18}
                        r={13}
                        fill={c.surface}
                      />
                      {/* Icon - pencil path */}
                      <G transform="translate(18 18) scale(0.68) translate(-12 -12)">
                        <Path
                          d="M19.5 7.5L16.5 4.5L4.5 16.5V19.5H7.5L19.5 7.5Z"
                          fill={c.newDark}
                          stroke={c.newDark}
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <Path
                          d="M16.5 7.5L19.5 4.5"
                          fill="none"
                          stroke={c.newDark}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </G>
                    </Svg>
                  </Pressable>
                )}
              </View>
            </RNAnimated.View>
          )

          const container = ownProfile ? (
            <Pressable
              onPress={handleAvatarPress}
              disabled={avatarUploading}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Change avatar"
              style={{
                width: outerRingSize,
                height: outerRingSize,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {avatarNode}
            </Pressable>
          ) : (
            avatarNode
          )

          // Render avatar (pressable for own profile to open picker)
          return <View style={{ paddingRight: 6 }}>{container}</View>
        })()}
      </View>
    </View>
  ) : null

  const showGrid = hasProfile
  const promptDisplayReady = showGrid && !loading
  const allowPromptPlaceholders =
    ownProfile && promptDisplayReady && displayGridItems.length < GRID_CAPACITY
  const showPromptChips = ownProfile && promptDisplayReady && displayGridItems.length < GRID_CAPACITY && !isEditMode

  const fabAnimatedStyle = useAnimatedStyle(() => {
    const shouldShow = hasProfile && !isEditMode
    return {
      opacity: withTiming(shouldShow ? 1 : 0, { 
        duration: shouldShow ? 500 : 200,
      }),
    }
  }, [hasProfile, isEditMode])

  const promptChipsAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(showPromptChips ? 1 : 0, { 
        duration: showPromptChips ? 500 : 200,
      }),
    }
  }, [showPromptChips])

  const handleShufflePromptSuggestions = useCallback(() => {
    setPromptSuggestions(createPromptBatch())
  }, [])

  const updateProfileCache = useCallback(
    (transform: (snapshot: ProfileData) => ProfileData) => {
      if (!profileUserId) {
        return
      }
      let nextSnapshot: ProfileData | undefined
      queryClient.setQueryData<ProfileData>(profileKeys.grid(profileUserId), (current) => {
        if (!current) return current
        const base: ProfileData = {
          profile: { ...current.profile },
          gridItems: [...current.gridItems],
          backlogItems: [...current.backlogItems],
        }
        nextSnapshot = transform(base)
        return nextSnapshot
      })

      const profileId = nextSnapshot?.profile.id ?? profileUserId

      if (nextSnapshot && profileId) {
        updateProfileCacheEntry(profileId, nextSnapshot.profile.userName ?? userName, () => nextSnapshot!)
      }
    },
    [profileUserId, queryClient, userName]
  )

  const handleAvatarSelection = useCallback(
    (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset?.uri) {
        setShowAvatarPicker(false)
        return
      }

      const previousAvatar = avatarUri || null

      setShowAvatarPicker(false)
      setOptimisticAvatarUri(asset.uri)
      avatarSwapOpacity.setValue(0.6)
      RNAnimated.timing(avatarSwapOpacity, {
        toValue: 1,
        duration: 220,
        easing: RNEasing.out(RNEasing.quad),
        useNativeDriver: true,
      }).start()
      setAvatarUploading(true)

      ;(async () => {
        try {
          const uploadedUrl = await pinataUpload(asset, { prefix: 'avatars' })
          const updatedRecord = await updateUser({ image: uploadedUrl, avatar_url: uploadedUrl })

          useAppStore.setState((state) => ({
            user:
              state.user && state.user.id === updatedRecord.id
                ? { ...state.user, image: uploadedUrl, avatar_url: uploadedUrl }
                : state.user,
          }))

          setProfile((prev) => (prev ? { ...prev, image: uploadedUrl, avatar_url: uploadedUrl } : updatedRecord))
          setOptimisticAvatarUri(uploadedUrl)

          const cachedEntry = getProfileCacheEntryByUserName(userName)
          const nextProfile = {
            ...(cachedEntry?.profile ?? updatedRecord),
            image: uploadedUrl,
            avatar_url: uploadedUrl,
          } as Profile
          updateProfileCacheEntry(updatedRecord.id, userName, (entry) => ({
            profile: nextProfile,
            gridItems: entry?.gridItems ?? gridItems,
            backlogItems: entry?.backlogItems ?? backlogItems,
          }))

          updateProfileCache((current) => ({
            ...current,
            profile: {
              ...current.profile,
              image: uploadedUrl,
              avatar_url: uploadedUrl,
            },
          }))

          const userId = updatedRecord.id
          if (userId) {
            const snapshotPayload: ProfileData = {
              profile: nextProfile,
              gridItems: cachedEntry?.gridItems ?? gridItems,
              backlogItems: cachedEntry?.backlogItems ?? backlogItems,
            }

            writeProfileSnapshot({
              userId,
              userName,
              profile: snapshotPayload.profile,
              gridItems: snapshotPayload.gridItems,
              backlogItems: snapshotPayload.backlogItems,
              updatedAt: Date.now(),
            }).catch((error) => {
              console.warn('Profile snapshot update failed:', error)
            })
          }
        } catch (error) {
          console.error('Failed to update avatar:', error)
          setOptimisticAvatarUri(previousAvatar || null)
        } finally {
          setAvatarUploading(false)
        }
      })()
    },
    [
      avatarUri,
      avatarSwapOpacity,
      updateUser,
      userName,
      gridItems,
      backlogItems,
      updateProfileCache,
    ]
  )

  const hasAnimatedBefore = gridAnimationHistory.has(userName)
  const gridFade = useRef(new RNAnimated.Value(hasAnimatedBefore ? 1 : 0)).current
  const gridScale = useRef(new RNAnimated.Value(hasAnimatedBefore ? 1 : 0.96)).current
  const gridAnimationPlayedRef = useRef(hasAnimatedBefore)

  const hasVisibleTiles = displayGridItems.length > 0 || allowPromptPlaceholders

  useProfileEffect('profile.playGridAnimation', () => {
    if (!showGrid) return
    if (!hasVisibleTiles) return

    if (gridAnimationPlayedRef.current) {
      gridFade.setValue(1)
      gridScale.setValue(1)
      return
    }

    gridAnimationPlayedRef.current = true
    gridAnimationHistory.add(userName)
    RNAnimated.parallel([
      RNAnimated.timing(gridFade, {
        toValue: 1,
        duration: 520,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }),
      RNAnimated.timing(gridScale, {
        toValue: 1,
        duration: 520,
        easing: RNEasing.out(RNEasing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [showGrid, gridFade, gridScale, userName, hasVisibleTiles])

  const gridContent = showGrid ? (
    <RNAnimated.View
      style={{
        width: '100%',
        opacity: gridFade,
        transform: [{ scale: gridScale }],
      }}
    >
    <Grid
      editingRights={true}
      screenFocused={focusReady}
      shouldAnimateStartup={justOnboarded}
      isEditMode={isEditMode}
      onPressItem={(item) => {
        if (!effectiveProfile || !item) return
        const openDetails = () => {
          setDetailsSheetData({
            itemId: item.id,
            profileUsername: effectiveProfile.userName,
            openedFromFeed: false,
          })
          detailsSheetRef.current?.snapToIndex(0)
        }

        if (isSettingsSheetOpen) {
          closeSettingsSheet({ afterClose: openDetails })
          return
        }

        openDetails()
      }}
      onLongPressItem={undefined}
      onRemoveItem={(item) => {
        if (!item) return
        const show = () => setRemovingItem(item)

        if (isSettingsSheetOpen) {
          closeSettingsSheet({ afterClose: show })
        } else {
          show()
        }
      }}
      onAddItem={(prompt?: string) => {
        const proceed = () => {
          if (!acceptPromptTap()) return
          if (prompt) {
            openNewRef({ prompt })
          } else {
            openNewRef()
          }
        }

        if (isSettingsSheetOpen) {
          closeSettingsSheet({ afterClose: proceed })
          return
        }

        proceed()
      }}
    onAddItemWithPrompt={(prompt: string, photoPath?: boolean, cameraPath?: boolean) => {
      const proceed = () => {
        if (!acceptPromptTap()) {
          if (__DEV__) {
            console.log('[prompt] tap throttled', { prompt })
          }
          return
        }
        if (__DEV__) {
          console.log('[prompt] tap accepted', { prompt, photoPath, cameraPath })
        }
        if (photoPath || cameraPath) {
          void triggerDirectPhotoPicker(prompt, cameraPath)
        } else {
          openNewRef({ prompt })
        }
        }

        if (isSettingsSheetOpen) {
          closeSettingsSheet({ afterClose: proceed })
          return
      }

      proceed()
    }}
        columns={GRID_COLUMNS}
      items={displayGridItems}
        rows={GRID_ROWS}
      rowGap={(s.$075 as number) + 5}
      newlyAddedItemId={newlyAddedItemId}
        showPrompts={allowPromptPlaceholders}
        rowJustify="center"
    />
    </RNAnimated.View>
  ) : null


  const profileQuery = useQuery<ProfileData>({
    queryKey: profileUserId ? profileKeys.grid(profileUserId) : ['profile', 'pending', 'grid'],
    queryFn: () => fetchProfileData({ userId: profileUserId! }),
    staleTime: 0,
    gcTime: 30 * 60_000,
    initialData: !hydraulicCache
      ? undefined
      : {
          profile: hydraulicCache.profile,
          gridItems: hydraulicCache.gridItems,
          backlogItems: hydraulicCache.backlogItems,
        },
    enabled: Boolean(profileUserId),
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: false,
  })

  const { data: profileData, isLoading: isProfileLoading } = profileQuery

  const invalidateProfile = useCallback(() => {
    void profileQuery.refetch()
  }, [profileQuery])

  const initialRefreshTriggerRef = useRef(profileRefreshTrigger)

  useProfileEffect('profile.profileRefreshTrigger', () => {
    if (profileRefreshTrigger === initialRefreshTriggerRef.current) {
      return
    }
    initialRefreshTriggerRef.current = profileRefreshTrigger
    invalidateProfile()
  }, [invalidateProfile, profileRefreshTrigger])

  const previousProfileRef = useRef<ProfileData | null>(null)
  const forceNetworkRefreshQueuedRef = useRef(false)

  useProfileEffect('profile.applyProfileDataEffect', () => {
    if (!profileData) return

    const previous = previousProfileRef.current
    if (previous === profileData) return

    if (__DEV__) {
      console.log('[boot-trace] profile.applyData', userName, {
        grid: profileData.gridItems.length,
        backlog: profileData.backlogItems.length,
      })
    }

    applyProfileData(profileData, { persist: false })
    setHydraulicCache(profileData)
    previousProfileRef.current = profileData
    setLoading(false)
  }, [applyProfileData, profileData])

  useProfileEffect('profile.forceNetworkRefreshEffect', () => {
    if (!profileUserId) return
    if (gridItems.length === 0) return
    if (gridItems.length >= GRID_CAPACITY) return
    if (forceNetworkRefreshQueuedRef.current) return
    if (interactionGateActive) return
    if (homePagerIndex !== 0) return

    const queryKey = profileKeys.grid(profileUserId)
    const state = queryClient.getQueryState<ProfileData>(queryKey)
    const dataUpdatedAt = state?.dataUpdatedAt ?? 0

    if (PERF_TRACE) {
      console.log('[profile][perf] forceRefresh:eligible', {
        gridCount: gridItems.length,
        dataUpdatedAt,
      })
    }

    const hasFreshData = dataUpdatedAt > 0 && Date.now() - dataUpdatedAt < PROFILE_FORCE_REFRESH_THRESHOLD_MS

    const cachedEntry = getProfileCacheEntryByUserName(userName)
    const hasRecentWarmup = Boolean(
      cachedEntry && Date.now() - cachedEntry.timestamp < PROFILE_FORCE_REFRESH_THRESHOLD_MS
    )

    const now = Date.now()
    const lastRefresh = profileForceRefreshTimestamps.get(profileUserId)
    const isStale = state?.isInvalidated ?? false

    if (hasFreshData || hasRecentWarmup || !isStale) {
      if (PERF_TRACE) {
        console.log('[profile][perf] forceRefresh:skipped:fresh', {
          hasFreshData,
          hasRecentWarmup,
          isStale,
        })
      }
      return
    }

    if (lastRefresh && now - lastRefresh < 60_000) {
      if (PERF_TRACE) {
        console.log('[profile][perf] forceRefresh:skipped:debounced', {
          lastRefresh,
        })
      }
      return
    }

    profileForceRefreshTimestamps.set(profileUserId, now)

    forceNetworkRefreshQueuedRef.current = true
    enqueueIdleTask(async () => {
      const refreshStartedAt = PERF_TRACE ? Date.now() : 0
      if (PERF_TRACE) {
        console.log('[profile][perf] forceRefresh:run')
      }
      try {
        const fresh = await fetchProfileData({ userId: profileUserId, includeBacklog: false })
        if (PERF_TRACE) {
          logProfilePerf('forceRefresh.fetchProfileData', refreshStartedAt)
        }
        applyProfileData(fresh)
      } catch (error) {
        if (__DEV__) {
          console.warn('[boot-trace] profile.forceNetworkRefresh failed', error)
        }
        if (PERF_TRACE) {
          logProfilePerf('forceRefresh.error', refreshStartedAt)
        }
      } finally {
        forceNetworkRefreshQueuedRef.current = false
        if (PERF_TRACE) {
          logProfilePerf('forceRefresh.total', refreshStartedAt)
        }
      }
    }, 'profile:forceNetworkRefresh')
  }, [applyProfileData, gridItems.length, homePagerIndex, interactionGateActive, profileUserId, queryClient, userName])

  useProfileEffect('profile.loadingStateEffect', () => {
    if (!profileData && isProfileLoading) {
      setLoading(true)
    }
  }, [profileData, isProfileLoading])

  useProfileEffect('profile.shareIntentEffect', () => {
    if (hasShareIntent) {
      if (shareIntentHandledRef.current) return
      shareIntentHandledRef.current = true
      openNewRef({ target: displayGridItems.length < GRID_CAPACITY ? 'grid' : 'backlog' })
    } else {
      shareIntentHandledRef.current = false
    }
  }, [hasShareIntent, displayGridItems.length, openNewRef])

  useProfileEffect('profile.focusReadyEffect', () => {
    if (!profileData) return

    let focusTimer: ReturnType<typeof setTimeout> | null = null

    setFocusReady(true)

    if (justOnboarded) {
      focusTimer = setTimeout(() => {
        setFocusReady(true)
      }, 2500)
      setJustOnboarded(false)
    }

    return () => {
      if (focusTimer) {
        clearTimeout(focusTimer)
      }
    }
  }, [profileData, justOnboarded, setJustOnboarded])

  // timeout used to stop editing the profile after 10 seconds
  let timeout: ReturnType<typeof setTimeout>

  // Direct photo/camera picker flow - route into existing NewRefSheet with pre-populated photo
  const triggerDirectPhotoPicker = useCallback(
    async (prompt: string, useCamera = false) => {
      if (directPhotoPickerGuardRef.current) return

      directPhotoPickerGuardRef.current = true
      try {
        // Request appropriate permissions
        const { status } = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync()
        
        if (status !== 'granted') {
          return
        }

        const pickerOptions = {
          allowsEditing: true,
          aspect: [1, 1] as [number, number],
          quality: 0.8,
        }

        const result = useCamera
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions)

        if (!result.canceled && result.assets && result.assets[0]) {
          const selectedImage = result.assets[0]
          Keyboard.dismiss()

          openNewRef({
            prompt,
            photo: {
              uri: selectedImage.uri,
              width: selectedImage.width ?? 0,
              height: selectedImage.height ?? 0,
            },
          })
        }
      } catch (error) {
        console.error('Error picking image:', error)
      } finally {
        directPhotoPickerGuardRef.current = false
      }
    },
    [openNewRef]
  )

  const handlePromptChipPress = useCallback(
    (prompt: PromptSuggestion) => {
      setPromptSuggestions((current) => {
        const remainder = current.filter((item) => item.text !== prompt.text)
        const needed = PROMPT_BATCH_SIZE - remainder.length
        if (needed <= 0) {
          return remainder
        }

        const exclude = new Set(remainder.map((item) => item.text))
        const replacements = createPromptBatch(needed, exclude)
        return [...remainder, ...replacements]
      })

      const execute = () => {
        if (!acceptPromptTap()) {
          return
        }
        if (prompt.photoPath || prompt.cameraPath) {
          void triggerDirectPhotoPicker(prompt.text, prompt.cameraPath)
          return
        }

        openNewRef({ prompt: prompt.text })
      }

      if (isSettingsSheetOpen) {
        closeSettingsSheet({ afterClose: execute })
        return
      }

      execute()
    },
    [acceptPromptTap, triggerDirectPhotoPicker, openNewRef, isSettingsSheetOpen, closeSettingsSheet]
  )

  const promptChipSection = promptSuggestions.length > 0 ? (
    <Animated.View
      style={[
        {
          marginTop: GRID_HEIGHT + s.$1,
          paddingHorizontal: 0,
          paddingBottom: s.$1half,
          zIndex: 4,
        },
        promptChipsAnimatedStyle,
      ]}
      pointerEvents={showPromptChips ? 'auto' : 'none'}
    >
      <View
        style={{
          backgroundColor: c.surface2,
          borderRadius: 26,
          paddingVertical: s.$1,
          paddingHorizontal: s.$1half,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.05)',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: s.$075,
          }}
        >
          <Text style={{ color: c.muted2, fontSize: 13, fontFamily: 'Inter', fontWeight: '500' }}>
            Need a spark? Tap to pin one.
          </Text>
          <Pressable
            onPress={handleShufflePromptSuggestions}
            hitSlop={10}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="shuffle-outline" size={16} color={c.muted2} style={{ marginRight: 4 }} />
            <Text style={{ color: c.muted2, fontSize: 13, fontFamily: 'Inter', fontWeight: '500' }}>Shuffle</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          {promptSuggestions.map((suggestion, index) => {
            const backgroundColor = PROMPT_CARD_BACKGROUNDS[index % PROMPT_CARD_BACKGROUNDS.length]
            const rotation = PROMPT_CARD_ROTATIONS[index % PROMPT_CARD_ROTATIONS.length]

            return (
              <Pressable
                key={`${suggestion.text}-${index}`}
                onPress={() => handlePromptChipPress(suggestion)}
                style={({ pressed }) => ({
                  marginHorizontal: 6,
                  marginVertical: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 999,
                  minWidth: 120,
                  backgroundColor,
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.05)',
                  shadowColor: '#000',
                  shadowOpacity: pressed ? 0.1 : 0.15,
                  shadowRadius: pressed ? 5 : 8,
                  shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                  elevation: pressed ? 2 : 4,
                  transform: [{ rotate: `${rotation}deg` }, { scale: pressed ? 0.97 : 1 }],
                })}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    left: '50%',
                    marginLeft: -6,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: c.olive,
                    opacity: 0.6,
                    shadowColor: '#6b5f49',
                    shadowOpacity: 0.25,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons
                    name={suggestion.cameraPath ? 'camera' : suggestion.photoPath ? 'camera-outline' : 'bulb-outline'}
                    size={15}
                    color={c.muted2}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ color: c.muted2, fontSize: 14, fontWeight: '600', textAlign: 'center', flexShrink: 1 }}>
                    {suggestion.text}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>
    </Animated.View>
  ) : null


  return (
    <RenderTimer label="[profile] render">
      <>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.surface }}
        contentContainerStyle={{
          justifyContent: 'center',
          alignItems: 'stretch',
          paddingBottom: s.$10,
          gap: s.$4,
          minHeight: '100%',
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={isEditMode || isSettingsSheetOpen}
      >
        <View
          style={{ flex: 1, width: '100%', backgroundColor: c.surface, paddingHorizontal: s.$1, position: 'relative' }}
        >
          <Animated.View
            entering={FadeIn.duration(400).delay(100)}
            exiting={FadeOut.duration(300)}
            key={`grid-${gridItems.length}-${hasProfile ? 'ready' : 'loading'}`}
            style={{
              paddingHorizontal: 0,
              paddingVertical: s.$1,
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              marginTop: -3,
              zIndex: 5,
              alignSelf: 'stretch',
            }}
          >
            {headerContent}
          </Animated.View>

          <View
            style={{
              position: 'absolute',
              top: 90,
              left: 0,
              right: 0,
              zIndex: 5,
            }}
          >
            {gridContent || <View style={{ height: GRID_HEIGHT }} />}

            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: GRID_HEIGHT,
              }}
            >
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    right: 5,
                    bottom: -65,
                    zIndex: 5,
                  },
                  fabAnimatedStyle,
                ]}
                pointerEvents={hasProfile && !isEditMode ? 'auto' : 'none'}
              >
                <FloatingJaggedButton
                  icon="plus"
                  onPress={() => {
                    openNewRef()
                  }}
                />
              </Animated.View>
              {isEditMode && (
                <Animated.View
                  entering={SlideInDown.duration(350).springify().damping(20).stiffness(120)}
                  exiting={SlideOutDown.duration(300).easing(Easing.inOut(Easing.cubic))}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -75,
                    zIndex: 5,
                    flexDirection: 'row',
                    gap: 12,
                    justifyContent: 'center',
                  }}
                  pointerEvents={isEditMode ? 'auto' : 'none'}
                >
                  <Pressable
                    onPress={openSettingsSheet}
                    style={({ pressed }) => ({
                      backgroundColor: c.surface2,
                      borderRadius: s.$12,
                      paddingVertical: 14,
                      paddingHorizontal: 22,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ color: c.muted2, fontSize: 15, fontWeight: '600', fontFamily: 'Inter' }}>
                      See Settings
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={exitEditMode}
                    style={({ pressed }) => ({
                      backgroundColor: c.olive,
                      borderRadius: s.$12,
                      paddingVertical: 14,
                      paddingHorizontal: 22,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ color: c.surface, fontSize: 15, fontWeight: '600', fontFamily: 'Inter' }}>
                      Done
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </View>

            {promptChipSection}

          </View>

          {hasProfile && !effectiveProfile && <Heading tag="h1">Profile for {userName} not found</Heading>}
        </View>

        {effectiveProfile && (
          <>
            <MyBacklogSheet
              backlogItems={backlogItems}
              profile={effectiveProfile}
              user={user}
              openAddtoBacklog={() => {
                openNewRef({ target: 'backlog' })
              }}
            />
          </>
        )}
      </ScrollView>
      {showAvatarPicker && (
        <Picker
          onSuccess={handleAvatarSelection}
          onCancel={handleAvatarPickerCancel}
          disablePinata
          options={{
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          }}
        />
      )}
      </>
    </RenderTimer>
  )
}

export default MyProfile
