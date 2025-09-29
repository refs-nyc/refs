import { useAppStore } from '@/features/stores'
import { getBacklogItems, getProfileItems, autoMoveBacklogToGrid } from '@/features/stores/items'
import type { Profile } from '@/features/types'
import { ExpandedItem } from '@/features/types'
import { s, c } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { useShareIntentContext } from 'expo-share-intent'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { ScrollView, View, Text, Pressable, Keyboard, InteractionManager } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import FloatingJaggedButton from '../buttons/FloatingJaggedButton'
import { DEFAULT_TILE_SIZE } from '../grid/GridTile'
import { Grid } from '../grid/Grid'
import { Button } from '../buttons/Button'
import Ionicons from '@expo/vector-icons/Ionicons'

import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { MyBacklogSheet } from './sheets/MyBacklogSheet'
import { RemoveRefSheet } from './sheets/RemoveRefSheet'
import SearchModeBottomSheet from './sheets/SearchModeBottomSheet'
import SearchResultsSheet, { SearchResultsSheetRef } from './sheets/SearchResultsSheet'
import { RefForm } from '../actions/RefForm'
import Animated, { FadeIn, FadeOut, Easing } from 'react-native-reanimated'
import { Animated as RNAnimated, Easing as RNEasing } from 'react-native'
import { Collections } from '@/features/pocketbase/pocketbase-types'
import { simpleCache } from '@/features/cache/simpleCache'

const profileMemoryCache = new Map<string, {
  profile: Profile
  gridItems: ExpandedItem[]
  backlogItems: ExpandedItem[]
  timestamp: number
}>()

const gridAnimationHistory = new Set<string>()

type PromptSuggestion = {
  text: string
  photoPath?: boolean
}

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  { text: 'Link you shared recently' },
  { text: 'free space' },
  { text: 'Place you feel like yourself' },
  { text: 'Example of perfect design' },
  { text: 'something you want to do more of' },
  { text: 'Piece from a museum', photoPath: true },
  { text: 'Most-rewatched movie' },
  { text: 'Tradition you love', photoPath: true },
  { text: 'Meme', photoPath: true },
  { text: 'Neighborhood spot' },
  { text: 'What you put on aux' },
  { text: 'halloween pic', photoPath: true },
  { text: 'Rabbit Hole' },
  { text: 'a preferred publication' },
  { text: 'something on your reading list' },
]

const PROMPT_BATCH_SIZE = 6

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

export const MyProfile = ({ userName }: { userName: string }) => {
  const { hasShareIntent } = useShareIntentContext()
  const insets = useSafeAreaInsets()

  const cachedEntry = profileMemoryCache.get(userName)

  const [profile, setProfile] = useState<Profile | undefined>(cachedEntry?.profile)
  const [gridItems, setGridItems] = useState<ExpandedItem[]>(cachedEntry?.gridItems ?? [])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>(cachedEntry?.backlogItems ?? [])
  const [loading, setLoading] = useState(!cachedEntry)
  const [gridHydrated, setGridHydrated] = useState(Boolean(cachedEntry?.gridItems?.length))
  const [focusReady, setFocusReady] = useState(Boolean(cachedEntry))
  const [removingItem, setRemovingItem] = useState<ExpandedItem | null>(null)

  // Get optimistic items from store
  const { optimisticItems, user } = useAppStore()

  const {
    getUserByUserName,
    moveToBacklog,
    removeItem,
    startEditProfile,
    stopEditProfile,
    stopEditing,
    setAddingNewRefTo,
    newRefSheetRef,
    searchMode,
    selectedRefs,
    selectedRefItems: globalSelectedRefItems,
    cachedSearchResults,
    isSearchResultsSheetOpen,
    setSearchMode,
    setSelectedRefs,
    setSelectedRefItems: setGlobalSelectedRefItems,
    cachedRefTitles,
    cachedRefImages,
    cachedSearchTitle,
    cachedSearchSubtitle,
    clearCachedSearchResults,
    setSearchResultsSheetOpen,
    logout,
    showLogoutButton,
    hasShownInitialPromptHold,
    setHasShownInitialPromptHold,
    justOnboarded,
    setJustOnboarded,
    addToProfile,
    addOptimisticItem,
    removeOptimisticItem,
    detailsBackdropAnimatedIndex,
    registerBackdropPress,
    unregisterBackdropPress,
  } = useAppStore()
  const ownProfile = user?.userName === userName
  const effectiveProfile = profile ?? (ownProfile ? (user ?? undefined) : undefined)
  const hasProfile = Boolean(effectiveProfile)

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

  // Track newly added optimistic items for animation
  useEffect(() => {
    // Only run if we have optimistic items
    if (optimisticItems.size === 0) return
    
    const optimisticItemsArray = Array.from(optimisticItems.values())
    
    // Find optimistic items that aren't in the grid items AND haven't been animated yet
    const newOptimisticItems = optimisticItemsArray.filter(item => 
      !gridItems.some(gridItem => gridItem.id === item.id) && 
      !animatedItemsRef.current.has(item.id)
    )
    
    if (newOptimisticItems.length > 0) {
      const newItemId = newOptimisticItems[0].id
      
      // Mark this item as animated
      animatedItemsRef.current.add(newItemId)
      
      // Set the first new optimistic item as the newly added item
      setNewlyAddedItemId(newItemId)
      
      // Clear the animation after 1.5 seconds but DON'T remove optimistic item yet
      const timer = setTimeout(() => {
        setNewlyAddedItemId(null)
        
        // Don't remove optimistic item here - let it stay until real item is confirmed
        // removeOptimisticItem(newItemId)
        // console.log('🗑️ REMOVED OPTIMISTIC ITEM FROM STORE:', newItemId)
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [optimisticItems.size, gridItems.length]) // Only depend on sizes, not the actual objects

  // Remove optimistic items when real items are confirmed
  useEffect(() => {
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

  // Cleanup optimistic items when component unmounts to prevent re-animation
  useEffect(() => {
    return () => {
      // When component unmounts, clear any remaining optimistic items
      const optimisticItemsArray = Array.from(optimisticItems.values())
      optimisticItemsArray.forEach(item => {
        removeOptimisticItem(item.id)
      })
      
      // Also clear any animation state
      setNewlyAddedItemId(null)
    }
  }, [optimisticItems.size])

  const [promptTextIndex, setPromptTextIndex] = useState(0)
  const [promptFadeKey, setPromptFadeKey] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)
  const [startupAnimationDone, setStartupAnimationDone] = useState(false)
  const [newlyAddedItemId, setNewlyAddedItemId] = useState<string | null>(null)
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>(() => createPromptBatch())
  const GRID_ROWS = 4
  const GRID_COLUMNS = 3
  const GRID_ROW_GAP = (s.$075 as number) + 5
  const GRID_HEIGHT = GRID_ROWS * DEFAULT_TILE_SIZE + (GRID_ROWS - 1) * GRID_ROW_GAP
  const GRID_CAPACITY = GRID_ROWS * GRID_COLUMNS

  const headerContent = hasProfile ? (
    searchMode || isSearchResultsSheetOpen ? (
      <Text
        style={{
          color: c.prompt,
          fontSize: s.$09,
          fontFamily: 'System',
          fontWeight: '400',
          textAlign: 'center',
          lineHeight: s.$1half,
        }}
      >
        What did you get into today?
      </Text>
    ) : gridItems.length >= 12 ? (
      <Text
        style={{
          color: c.prompt,
          fontSize: s.$09,
          fontFamily: 'System',
          fontWeight: '400',
          textAlign: 'center',
          lineHeight: s.$1half,
        }}
      >
        What did you get into today?
      </Text>
    ) : (
      <Animated.Text
        entering={FadeIn.duration(800)}
        exiting={FadeOut.duration(800)}
        key={`prompt-text-${promptTextIndex}-${promptFadeKey}`}
        style={{
          color: c.prompt,
          fontSize: s.$09,
          fontFamily: 'System',
          fontWeight: '400',
          textAlign: 'center',
          lineHeight: s.$1half,
          minWidth: 280,
          minHeight: s.$1half,
        }}
      >
        {showPrompt
          ? promptTextIndex === 0
            ? 'these prompts will disappear after you add'
            : '(no one will know you used them)'
          : ''}
      </Animated.Text>
    )
  ) : (
    null
  )

  const showGrid = hasProfile && gridHydrated
  const allowPromptPlaceholders =
    showGrid &&
    !searchMode &&
    !isSearchResultsSheetOpen &&
    !loading &&
    displayGridItems.length < GRID_CAPACITY
  const showPromptChips =
    ownProfile &&
    showGrid &&
    !searchMode &&
    !isSearchResultsSheetOpen &&
    !loading &&
    displayGridItems.length < GRID_CAPACITY

  const handleShufflePromptSuggestions = useCallback(() => {
    setPromptSuggestions(createPromptBatch())
  }, [])

  const hasAnimatedBefore = gridAnimationHistory.has(userName)
  const gridFade = useRef(new RNAnimated.Value(hasAnimatedBefore ? 1 : 0)).current
  const gridScale = useRef(new RNAnimated.Value(hasAnimatedBefore ? 1 : 0.96)).current
  const gridAnimationPlayedRef = useRef(hasAnimatedBefore)

  useEffect(() => {
    if (!showGrid) return

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
  }, [showGrid, gridFade, gridScale, userName])

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
        screenFocused={focusReady && !loading}
        shouldAnimateStartup={justOnboarded}
        onStartupAnimationComplete={() => setStartupAnimationDone(true)}
        onPressItem={(item) => {
          setDetailsItem(item!)
          detailsSheetRef.current?.snapToIndex(0)
        }}
        onLongPressItem={() => {
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            stopEditProfile()
          }, 10000)
          startEditProfile()
        }}
        onRemoveItem={(item) => {
          setRemovingItem(item)
          removeRefSheetRef.current?.expand()
        }}
        onAddItem={(prompt?: string) => {
          setAddingNewRefTo('grid')
          if (prompt) useAppStore.getState().setAddRefPrompt(prompt)
          newRefSheetRef.current?.snapToIndex(1)
        }}
        onAddItemWithPrompt={(prompt: string, photoPath?: boolean) => {
          if (photoPath) {
            triggerDirectPhotoPicker(prompt)
          } else {
            setAddingNewRefTo('grid')
            useAppStore.getState().setAddRefPrompt(prompt)
            newRefSheetRef.current?.snapToIndex(1)
          }
        }}
        columns={GRID_COLUMNS}
        items={displayGridItems}
        rows={GRID_ROWS}
        rowGap={(s.$075 as number) + 5}
        searchMode={searchMode}
        selectedRefs={selectedRefs}
        setSelectedRefs={setSelectedRefs}
        newlyAddedItemId={newlyAddedItemId}
        showPrompts={allowPromptPlaceholders}
      />
    </RNAnimated.View>
  ) : null

  const searchDismissOverlays = hasProfile && searchMode ? (
    <>
      <Pressable
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, backgroundColor: 'transparent', zIndex: 1 }}
        onPress={() => {
          setSearchMode(false)
          if (!searchMode) {
            setSelectedRefs([])
          }
        }}
      />
      <Pressable
        style={{ position: 'absolute', top: 90, left: 0, width: 16, bottom: 0, backgroundColor: 'transparent', zIndex: 1 }}
        onPress={() => {
          setSearchMode(false)
          if (!searchMode) {
            setSelectedRefs([])
          }
        }}
      />
      <Pressable
        style={{ position: 'absolute', top: 90, right: 0, width: 16, bottom: 0, backgroundColor: 'transparent', zIndex: 1 }}
        onPress={() => {
          setSearchMode(false)
          if (!searchMode) {
            setSelectedRefs([])
          }
        }}
      />
      <Pressable
        style={{ position: 'absolute', top: 590, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', zIndex: 1 }}
        onPress={() => {
          setSearchMode(false)
          if (!searchMode) {
            setSelectedRefs([])
          }
        }}
      />
    </>
  ) : null
  
  // Track which items have already been animated to prevent re-animation on grid refresh
  const animatedItemsRef = useRef<Set<string>>(new Set())
  
  // Direct photo form state
  const [showDirectPhotoForm, setShowDirectPhotoForm] = useState(false)
  const [directPhotoRefFields, setDirectPhotoRefFields] = useState<{
    title: string
    image: string
    url: string
    promptContext: string
  } | null>(null)



  // Register backdrop press for direct photo form
  useEffect(() => {
    if (showDirectPhotoForm) {
      const key = registerBackdropPress(() => {
        setShowDirectPhotoForm(false)
        setDirectPhotoRefFields(null)
        // Ensure backdrop animated index is reset when closed via backdrop press
        if (detailsBackdropAnimatedIndex) {
          detailsBackdropAnimatedIndex.value = -1
        }
      })
      return () => {
        unregisterBackdropPress(key)
      }
    }
  }, [showDirectPhotoForm, detailsBackdropAnimatedIndex])

  // Simple keyboard dismissal - snap to 67% when keyboard is not showing
  useEffect(() => {
    if (!showDirectPhotoForm) return
    
    const keyboardDidHide = () => {
      if (photoRefFormRef.current) {
        photoRefFormRef.current.snapToIndex(0)
      }
    }
    
    const hideSubscription = Keyboard.addListener('keyboardDidHide', keyboardDidHide)
    
    return () => {
      hideSubscription?.remove()
    }
  }, [showDirectPhotoForm])









  // Render backdrop for direct photo form
  const renderDirectPhotoBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  // Refs
  const searchResultsSheetRef = useRef<BottomSheet>(null)
  const isExpandingSheetRef = useRef(false) // Track if we're already expanding the sheet
  const searchResultsSheetTriggerRef = useRef<SearchResultsSheetRef>(null)
  const photoRefFormRef = useRef<BottomSheet>(null)

  // Simple cache to avoid refetching the same data
  // Memoized grid items map for O(1) lookup
  const markGridReady = useCallback(() => {
    requestAnimationFrame(() => setGridHydrated(true))
  }, [])

  const gridItemsMap = useMemo(() => new Map(gridItems.map((item) => [item.id, item])), [gridItems])

  // Memoized selectedRefItems computation for better performance
  const selectedRefItems = useMemo(() => {
    if (selectedRefs.length === 0 || gridItems.length === 0) {
      return []
    }

    return selectedRefs.map((id) => {
      const gridItem = gridItemsMap.get(id)
      if (!gridItem) return null
      
      // Transform ExpandedItem to the structure SearchResultsSheet expects
      return {
        id: gridItem.id,
        ref: gridItem.ref,
        image: gridItem.image || '',
        title: gridItem.expand?.ref?.title || gridItem.id,
        expand: {
          ref: {
            id: gridItem.id,
            title: gridItem.expand?.ref?.title || gridItem.id,
            image: gridItem.image || '',
          },
        },
      }
    }).filter(Boolean)
  }, [selectedRefs, gridItemsMap])

  // Use the selectedRefItems directly
  const finalSelectedRefItems = selectedRefItems



  const refreshGrid = async (userName: string) => {
    const hadMemory = profileMemoryCache.has(userName)
    if (!hadMemory) {
      setLoading(true)
      setGridHydrated(false)
    }

    const storeState = useAppStore.getState()
    const storeUser = storeState.user
    const cacheUserId = storeUser?.userName === userName ? storeUser.id : undefined

    const memoryCached = profileMemoryCache.get(userName)
    if (memoryCached) {
      setProfile(memoryCached.profile)
      setGridItems(memoryCached.gridItems)
      setBacklogItems(memoryCached.backlogItems)
      setLoading(false)
      storeState.setGridItemCount(memoryCached.gridItems.length)
      markGridReady()
    }

    const hydrateFromCache = async (userId?: string) => {
      if (!userId) return false

      const [cachedProfile, cachedGridItems, cachedBacklogItems] = await Promise.all([
        simpleCache.get('profile', userId),
        simpleCache.get('grid_items', userId),
        simpleCache.get('backlog_items', userId),
      ])

      if (!cachedProfile || !cachedGridItems || !cachedBacklogItems) {
        return false
      }

      setProfile(cachedProfile as Profile)
      setGridItems(cachedGridItems as ExpandedItem[])
      setBacklogItems(cachedBacklogItems as ExpandedItem[])
      setLoading(false)
      markGridReady()
      storeState.setGridItemCount((cachedGridItems as ExpandedItem[]).length)
      profileMemoryCache.set(userName, {
        profile: cachedProfile as Profile,
        gridItems: cachedGridItems as ExpandedItem[],
        backlogItems: cachedBacklogItems as ExpandedItem[],
        timestamp: Date.now(),
      })
      return true
    }

    const cacheHydrated = await hydrateFromCache(cacheUserId)


    const fetchFreshData = async () => {
      try {
        const profileRecord = await getUserByUserName(userName)
        const [gridItemsRecord, backlogItemsRecord] = await Promise.all([
          getProfileItems(userName),
          getBacklogItems(userName),
        ])

        setProfile(profileRecord)
        setGridItems(gridItemsRecord)
        setBacklogItems(backlogItemsRecord as ExpandedItem[])
        setLoading(false)
        markGridReady()
        useAppStore.getState().setGridItemCount(gridItemsRecord.length)

        profileMemoryCache.set(userName, {
          profile: profileRecord,
          gridItems: gridItemsRecord,
          backlogItems: backlogItemsRecord as ExpandedItem[],
          timestamp: Date.now(),
        })

        const userId = profileRecord.id
        const cacheUpdates = [
          simpleCache.set('profile', profileRecord, userId),
          simpleCache.set('grid_items', gridItemsRecord, userId),
          simpleCache.set('backlog_items', backlogItemsRecord, userId),
        ]

        void Promise.all(cacheUpdates).catch((error) => {
          console.warn('Cache write failed:', error)
        })

        if (userName === useAppStore.getState().user?.userName) {
          void autoMoveBacklogToGrid(userName, gridItemsRecord, backlogItemsRecord as ExpandedItem[]).catch((error) => {
            console.warn('Background operations failed:', error)
          })
        }
      } catch (error) {
        console.error('Failed to refresh grid:', error)
        if (!cacheHydrated) {
          setLoading(false)
          markGridReady()
        }
      }
    }

    void fetchFreshData()
  }

  const handleMoveToBacklog = async () => {
    if (!removingItem) return
    try {
      removeRefSheetRef.current?.close()
      
      const { optimisticItems, removeOptimisticItem, decrementGridItemCount } = useAppStore.getState()
      
      // Check if this is an optimistic item
      const isOptimistic = removingItem.id.startsWith('temp-') || optimisticItems.has(removingItem.id)
      
      if (isOptimistic) {
        // Remove from optimistic items immediately
        removeOptimisticItem(removingItem.id)
        decrementGridItemCount()
      } else {
        // For real items, remove from local grid immediately
        setGridItems(prev => prev.filter(item => item.id !== removingItem.id))
        decrementGridItemCount()
        
        // Background database operation
        ;(async () => {
          try {
            await moveToBacklog(removingItem.id)
          } catch (error) {
            console.error('Failed to move item to backlog:', error)
            // Could revert by refreshing grid if needed
          }
        })()
      }
      
      setRemovingItem(null)
    } catch (error) {
      console.error(error)
    }
  }

  const handleRemoveFromProfile = async () => {
    if (!removingItem) return
    removeRefSheetRef.current?.close()
    
    const { optimisticItems, removeOptimisticItem, decrementGridItemCount } = useAppStore.getState()
    
    // Check if this is an optimistic item
    const isOptimistic = removingItem.id.startsWith('temp-') || optimisticItems.has(removingItem.id)
    
    if (isOptimistic) {
      // Remove from optimistic items immediately
      removeOptimisticItem(removingItem.id)
      decrementGridItemCount()
    } else {
      // For real items, remove from local grid immediately
      setGridItems(prev => prev.filter(item => item.id !== removingItem.id))
      decrementGridItemCount()
      
      // Background database operation
      ;(async () => {
        try {
          await removeItem(removingItem.id)
        } catch (error) {
          console.error('Failed to remove item:', error)
          // Could revert by refreshing grid if needed
        }
      })()
    }
    
    setRemovingItem(null)
  }

  useEffect(() => {
    if (hasShareIntent) {
      setAddingNewRefTo(displayGridItems.length < GRID_CAPACITY ? 'grid' : 'backlog')
      bottomSheetRef.current?.snapToIndex(1)
    }
  }, [hasShareIntent])

  useEffect(() => {
    if (!effectiveProfile?.userName) return
    profileMemoryCache.set(effectiveProfile.userName, {
      profile: effectiveProfile,
      gridItems,
      backlogItems,
      timestamp: Date.now(),
    })
  }, [effectiveProfile?.userName, gridItems, backlogItems])

  useEffect(() => {
    let cancelled = false
    // Make gesture controls available immediately
    setFocusReady(true)

    const init = async () => {
      try {
        await refreshGrid(userName)

        const returningFromSearch = cachedSearchResults.length > 0 || isSearchResultsSheetOpen || searchMode
        if (returningFromSearch) {
          return
        }
        if (justOnboarded) {
          setTimeout(() => setFocusReady(true), 2500)
          setJustOnboarded(false)
        }
      } catch (error) {
        console.error('Failed to refresh grid:', error)
      }
    }

    const handle = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) {
        void init()
      }
    })

    return () => {
      cancelled = true
      handle.cancel()
    }
  }, [userName, cachedSearchResults.length, isSearchResultsSheetOpen, searchMode, justOnboarded, setJustOnboarded])

  // Simplified back button restoration logic - just reset sheet state
  useEffect(() => {
    // If we have cached search results and we're on the profile page, reset sheet state
    if (cachedSearchResults.length > 0 && !searchMode) {
      if (isSearchResultsSheetOpen) {
        setSearchResultsSheetOpen(false)
      }
      // Ensure grid renders immediately behind sheet when restoring
      setFocusReady(true)
      // The SearchResultsSheet will auto-open itself when it detects cached results
    }
  }, [cachedSearchResults.length, searchMode, isSearchResultsSheetOpen, userName, setSearchResultsSheetOpen])

  // Reset search mode when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // Cleanup: reset search mode when leaving the screen
      // But preserve selectedRefs and cachedSearchResults for back button restoration
      setSearchMode(false)
      setSearchResultsSheetOpen(false) // Reset sheet open state when leaving
      // Don't clear selectedRefs or cachedSearchResults here - preserve them for back button
    }
  }, [setSearchMode, setSearchResultsSheetOpen])

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const removeRefSheetRef = useRef<BottomSheet>(null)

  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)

  // timeout used to stop editing the profile after 10 seconds
  let timeout: ReturnType<typeof setTimeout>

  // Animate prompt text with explicit schedule: L1 (3s) → pause (2s) → L2 (3s) → pause (2s) → repeat
  useEffect(() => {
    const promptsActive = displayGridItems.length < GRID_CAPACITY && !searchMode && !isSearchResultsSheetOpen && !loading
    const canShowPromptsNow = promptsActive && (startupAnimationDone || !(displayGridItems.length === 0))
    let tShow: ReturnType<typeof setTimeout> | null = null
    let tPause: ReturnType<typeof setTimeout> | null = null

    if (canShowPromptsNow) {
      setPromptTextIndex(0)
      setShowPrompt(true)
      setPromptFadeKey((k) => k + 1)

      const cycle = (idx: number) => {
        // visible for 3s
        tShow = setTimeout(() => {
          // fade out and pause 2s
          setShowPrompt(false)
          setPromptFadeKey((k) => k + 1)
          tPause = setTimeout(() => {
            const next = idx === 0 ? 1 : 0
            setPromptTextIndex(next)
            setShowPrompt(true)
            setPromptFadeKey((k) => k + 1)
            cycle(next)
          }, 2000)
        }, 3000)
      }

      cycle(0)

      return () => {
        if (tShow) clearTimeout(tShow)
        if (tPause) clearTimeout(tPause)
      }
    } else {
      setShowPrompt(false)
      setPromptTextIndex(0)
    }
  }, [displayGridItems.length, searchMode, isSearchResultsSheetOpen, startupAnimationDone, loading])

  // Direct photo picker flow - route into existing NewRefSheet with pre-populated photo
  const triggerDirectPhotoPicker = useCallback(async (prompt: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0]
        try { useAppStore.getState().setSelectedPhoto(selectedImage.uri) } catch {}
        try { useAppStore.getState().setAddRefPrompt(prompt) } catch {}
        setAddingNewRefTo('grid')
        newRefSheetRef.current?.snapToIndex(1)
      }
    } catch (error) {
      console.error('Error picking image:', error)
    }
  }, [setAddingNewRefTo])

  const handlePromptChipPress = useCallback((prompt: PromptSuggestion) => {
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

    if (prompt.photoPath) {
      void triggerDirectPhotoPicker(prompt.text)
      return
    }

    setAddingNewRefTo('grid')
    try { useAppStore.getState().setAddRefPrompt(prompt.text) } catch {}
    newRefSheetRef.current?.snapToIndex(1)
  }, [triggerDirectPhotoPicker, setAddingNewRefTo])

  const promptChipSection = showPromptChips && promptSuggestions.length > 0 ? (
    <Animated.View
      entering={FadeIn.duration(300).delay(120)}
      style={{
        marginTop: GRID_HEIGHT + s.$1,
        paddingHorizontal: s.$1half,
        paddingBottom: s.$1half,
        zIndex: 4,
      }}
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
          <Text style={{ color: c.muted2, fontSize: 14, fontWeight: '600' }}>
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
            <Text style={{ color: c.muted2, fontSize: 13, fontWeight: '500' }}>Shuffle</Text>
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
                    name={suggestion.photoPath ? 'camera-outline' : 'bulb-outline'}
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
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.surface }}
        contentContainerStyle={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: s.$08,
          paddingBottom: s.$10,
          gap: s.$4,
          minHeight: '100%',
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <View
          style={{
            flex: 1,
            width: '100%',
            marginHorizontal: s.$1half,
            backgroundColor: c.surface,
          }}
        >
          <Animated.View
            entering={FadeIn.duration(400).delay(100)}
            exiting={FadeOut.duration(300)}
            key={`${searchMode}-${gridItems.length}-${hasProfile ? 'ready' : 'loading'}`}
            style={{
              paddingHorizontal: 10,
              paddingVertical: s.$1,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 7,
              zIndex: 5,
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
              <FloatingJaggedButton
                icon="plus"
                onPress={() => {
                  setAddingNewRefTo('grid')
                  try { useAppStore.getState().setAddRefPrompt('') } catch {}
                  newRefSheetRef.current?.snapToIndex(1)
                }}
                style={{
                  position: 'absolute',
                  right: s.$075,
                  bottom: s.$075-65,
                  zIndex: 5,
                  opacity: hasProfile && !searchMode ? 1 : 0,
                }}
              />
            </View>

            {promptChipSection}
          </View>

          {hasProfile && !effectiveProfile && <Heading tag="h1">Profile for {userName} not found</Heading>}

          {searchDismissOverlays}
        </View>

        {showLogoutButton && (
          <View
            style={{
              position: 'absolute',
              bottom: 50,
              left: 0,
              right: 0,
              alignItems: 'center',
              zIndex: 4,
            }}
          >
            <Button
              style={{ width: 120 }}
              variant="inlineSmallMuted"
              title="Log out"
              onPress={logout}
            />
          </View>
        )}

        {effectiveProfile && (
          <>
            <MyBacklogSheet
              backlogItems={backlogItems}
              profile={effectiveProfile}
              user={user}
              openAddtoBacklog={() => {
                setAddingNewRefTo('backlog')
                newRefSheetRef.current?.snapToIndex(1)
              }}
            />
            <RemoveRefSheet
              bottomSheetRef={removeRefSheetRef}
              handleMoveToBacklog={handleMoveToBacklog}
              handleRemoveFromProfile={handleRemoveFromProfile}
              item={removingItem}
            />
            {detailsItem && (
              <ProfileDetailsSheet
                profileUsername={effectiveProfile.userName}
                detailsItemId={detailsItem.id}
                onChange={(index: number) => {
                  if (index === -1) {
                    // Reset editing mode when carousel closes
                    stopEditing()
                    setDetailsItem(null)
                  }
                }}
                openedFromFeed={false}
                detailsSheetRef={detailsSheetRef}
              />
            )}

            {/* Search Results Sheet - render after FloatingJaggedButton so it appears above */}
            <SearchResultsSheet
              ref={searchResultsSheetTriggerRef}
              bottomSheetRef={searchResultsSheetRef}
              selectedRefs={selectedRefs}
              selectedRefItems={finalSelectedRefItems}
            />

            {/* Direct Photo Form - bypasses NewRefSheet entirely */}
            {showDirectPhotoForm && directPhotoRefFields && (
              <BottomSheet

                ref={photoRefFormRef}
                snapPoints={['80%', '85%', '100%', '110%']}
                index={0}
                enablePanDownToClose={true}





                            backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
                animatedIndex={detailsBackdropAnimatedIndex}
                backdropComponent={(p) => (
                  <BottomSheetBackdrop
                    {...p}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    pressBehavior={'close'}
                  />
                )}
                handleComponent={null}
                enableDynamicSizing={false}
                enableOverDrag={false}
                onChange={(i: number) => {
                  if (i === -1) {
                    Keyboard.dismiss()
                    setShowDirectPhotoForm(false)
                    setDirectPhotoRefFields(null)
                    // Ensure backdrop animated index is reset
                    if (detailsBackdropAnimatedIndex) {
                      detailsBackdropAnimatedIndex.value = -1
                    }
                  }
                }}
              >
                <BottomSheetView
                  style={{
                    paddingHorizontal: s.$2,
                    paddingTop: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RefForm
                    key={`direct-photo-form-${directPhotoRefFields.image}`}
                    existingRefFields={directPhotoRefFields}
                    pickerOpen={false}
                    canEditRefData={true}
                    

                    onAddRef={async (itemFields) => {
                      // Merge promptContext from directPhotoRefFields if present
                      // Ensure title is not empty - use prompt context as fallback
                      const mergedFields = { 
                        ...itemFields, 
                        promptContext: directPhotoRefFields.promptContext,
                        title: itemFields.title || directPhotoRefFields.promptContext || 'Untitled'
                      }
                      
                      // Create optimistic item immediately
                      const optimisticItem: ExpandedItem = {
                        id: `temp-${Date.now()}`, collectionId: Collections.Items, collectionName: Collections.Items,
                        creator: user?.id || '', ref: 'temp-ref', image: itemFields.image || '',
                        url: itemFields.url || '', text: itemFields.text || '', list: itemFields.list || false,
                        parent: itemFields.parent || '', backlog: false, order: 0,
                        created: new Date().toISOString(), updated: new Date().toISOString(),
                        promptContext: mergedFields.promptContext || '',
                        expand: { 
                          ref: { 
                            id: 'temp-ref', 
                            title: itemFields.title || '', 
                            image: itemFields.image || '',
                            url: itemFields.url || '',
                            meta: '{}',
                            creator: user?.id || '',
                            created: new Date().toISOString(),
                            updated: new Date().toISOString()
                          }, 
                          creator: null as any, 
                          items_via_parent: [] as any 
                        }
                      }

                      // Add optimistic item to grid immediately
                      addOptimisticItem(optimisticItem)

                      // Close the sheet immediately and reset backdrop
                      Keyboard.dismiss()
                      setShowDirectPhotoForm(false)
                      setDirectPhotoRefFields(null)
                      if (detailsBackdropAnimatedIndex) {
                        detailsBackdropAnimatedIndex.value = -1
                      }
                      
                      // Background database operations
                      ;(async () => {
                        try {
                          await addToProfile(null, mergedFields, false)
                        } catch (error) {
                          console.error('Failed to add item to profile:', error)
                          // Remove optimistic item on failure
                          removeOptimisticItem(optimisticItem.id)
                        }
                      })()
                    }}
                    onAddRefToList={async (itemFields) => {
                      // Merge promptContext from directPhotoRefFields if present
                      // Ensure title is not empty - use prompt context as fallback
                      const mergedFields = { 
                        ...itemFields, 
                        promptContext: directPhotoRefFields.promptContext,
                        title: itemFields.title || directPhotoRefFields.promptContext || 'Untitled'
                      }
                      const newItem = await addToProfile(null, mergedFields, false)
                      Keyboard.dismiss()
                      setShowDirectPhotoForm(false)
                      setDirectPhotoRefFields(null)
                      if (detailsBackdropAnimatedIndex) {
                        detailsBackdropAnimatedIndex.value = -1
                      }
                    }}
                    backlog={false}
                  />
                </BottomSheetView>
              </BottomSheet>
            )}

            {/* Search Bottom Sheet (only in search mode, always rendered last) */}
            {searchMode && (
              <SearchModeBottomSheet
                open={false} // start minimized when searchMode is true
                onClose={() => setSearchMode(false)}
                selectedRefs={selectedRefs}
                selectedRefItems={selectedRefItems}
                onSearch={() => {
                  // Clear restored ref items for new searches
        
                  setGlobalSelectedRefItems([]) // Also clear global state
                  searchResultsSheetRef.current?.snapToIndex(1)
                  setSearchMode(false) // Exit search mode when opening search results
                  // Trigger the search after a small delay to ensure the sheet is open
                  setTimeout(() => {
                    if (searchResultsSheetTriggerRef.current) {
                      searchResultsSheetTriggerRef.current.triggerSearch()
                    } else {
                    }
                  }, 300) // Increased delay to ensure sheet is fully open
                }}
                onRestoreSearch={async (historyItem) => {
                  try {
                    
                    // Create ref items from history data with images
                    const restoredItems = historyItem.ref_ids.map((refId: string, index: number) => ({
                      id: refId,
                      ref: refId,
                      title: historyItem.ref_titles?.[index] || refId,
                      image: historyItem.ref_images?.[index] || '',
                      expand: {
                        ref: {
                          id: refId,
                          title: historyItem.ref_titles?.[index] || refId,
                          image: historyItem.ref_images?.[index] || '',
                        },
                      },
                    }))

                    // Set the selected refs and items so the SearchResultsSheet doesn't show validation error
                    setSelectedRefs(historyItem.ref_ids)
                    setGlobalSelectedRefItems(restoredItems)

                    // Open the search results sheet immediately
                    searchResultsSheetRef.current?.snapToIndex(1)
                    setSearchMode(false)

                    // Use the cached search results from history AFTER setting the flag
                    setTimeout(() => {
                      if (searchResultsSheetTriggerRef.current) {
                        searchResultsSheetTriggerRef.current.restoreSearchFromHistory(historyItem)
                      }
                    }, 100)
                  } catch (error) {
                    console.error('❌ Error restoring search from history:', error)
                  }
                }}
              />
            )}
          </>
        )}
      </ScrollView>
    </>
  )
}
