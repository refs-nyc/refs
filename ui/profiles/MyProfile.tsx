import { useAppStore } from '@/features/stores'
import { getBacklogItems, getProfileItems, autoMoveBacklogToGrid } from '@/features/stores/items'
import type { Profile } from '@/features/types'
import { ExpandedItem } from '@/features/types'
import { s, c } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { useShareIntentContext } from 'expo-share-intent'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { ScrollView, View, Text, Pressable, Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import FloatingJaggedButton from '../buttons/FloatingJaggedButton'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { Button } from '../buttons/Button'

import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { MyBacklogSheet } from './sheets/MyBacklogSheet'
import { RemoveRefSheet } from './sheets/RemoveRefSheet'
import SearchModeBottomSheet from './sheets/SearchModeBottomSheet'
import SearchResultsSheet, { SearchResultsSheetRef } from './sheets/SearchResultsSheet'
import { RefForm } from '../actions/RefForm'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { Collections } from '@/features/pocketbase/pocketbase-types'
import { pocketbase } from '@/features/pocketbase'
import { simpleCache } from '@/features/cache/simpleCache'

export const MyProfile = ({ userName }: { userName: string }) => {
  const { hasShareIntent } = useShareIntentContext()
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<Profile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [focusReady, setFocusReady] = useState(false)
  const [removingItem, setRemovingItem] = useState<ExpandedItem | null>(null)

  // Get optimistic items from store
  const { optimisticItems } = useAppStore()

  const {
    user,
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
    
    console.log('🔍 NEW OPTIMISTIC ITEMS FOUND:', newOptimisticItems.length, 'IDs:', newOptimisticItems.map(item => item.id))
    
    if (newOptimisticItems.length > 0) {
      const newItemId = newOptimisticItems[0].id
      
      // Mark this item as animated
      animatedItemsRef.current.add(newItemId)
      
      // Set the first new optimistic item as the newly added item
      setNewlyAddedItemId(newItemId)
      console.log('🎯 SETTING NEWLY ADDED ITEM ID:', newItemId)
      
      // Clear the animation after 1.5 seconds but DON'T remove optimistic item yet
      const timer = setTimeout(() => {
        setNewlyAddedItemId(null)
        console.log('🎯 CLEARING NEWLY ADDED ITEM ID')
        
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
      console.log('✅ REMOVING CONFIRMED OPTIMISTIC ITEM:', item.id)
      removeOptimisticItem(item.id)
    })
  }, [gridItems, optimisticItems.size])

  // Cleanup optimistic items when component unmounts to prevent re-animation
  useEffect(() => {
    return () => {
      // When component unmounts, clear any remaining optimistic items
      const optimisticItemsArray = Array.from(optimisticItems.values())
      optimisticItemsArray.forEach(item => {
        console.log('🧹 CLEANUP: Removing optimistic item on unmount:', item.id)
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
  const lastFetchedUserName = useRef<string>('')
  const lastFetchedTrigger = useRef<number>(0)

  // Memoized grid items map for O(1) lookup
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
    setLoading(true)
    
    try {
      // Start with cache check immediately (fastest path)
      const user = await pocketbase.collection('users').getFirstListItem(`userName = "${userName}"`)
      const userId = user.id
      
      // Check cache first (read-only, safe operation)
      const [cachedProfile, cachedGridItems, cachedBacklogItems] = await Promise.all([
        simpleCache.get('profile', userId),
        simpleCache.get('grid_items', userId),
        simpleCache.get('backlog_items', userId)
      ])
      
      // Use cached data if available (fastest path)
      if (cachedProfile && cachedGridItems && cachedBacklogItems) {
        console.log('📖 Using cached profile data')
        setProfile(cachedProfile as Profile)
        setGridItems(cachedGridItems as ExpandedItem[])
        setBacklogItems(cachedBacklogItems as ExpandedItem[])
        setLoading(false)
        
        // Update cached grid count
        useAppStore.getState().setGridItemCount((cachedGridItems as ExpandedItem[]).length)
        
        // Only run autoMoveBacklogToGrid for own profile
        if (userName === useAppStore.getState().user?.userName) {
          Promise.all([
            autoMoveBacklogToGrid(userName)
          ]).catch(error => {
            console.warn('Background operations failed:', error)
          })
        }
        
        return
      }
      
      // Cache miss - fetch fresh data in parallel
      const [profile, gridItems, backlogItems] = await Promise.all([
        getUserByUserName(userName),
        getProfileItems(userName),
        getBacklogItems(userName),
      ])
      
      // Update state immediately
      setProfile(profile)
      setGridItems(gridItems)
      setBacklogItems(backlogItems as ExpandedItem[])
      setLoading(false)
      
      // Update cached grid count
      useAppStore.getState().setGridItemCount(gridItems.length)
      
      // Only run autoMoveBacklogToGrid for own profile
      if (userName === useAppStore.getState().user?.userName) {
        Promise.all([
          autoMoveBacklogToGrid(userName),
          simpleCache.set('profile', profile, userId),
          simpleCache.set('grid_items', gridItems, userId),
          simpleCache.set('backlog_items', backlogItems, userId)
        ]).catch(error => {
          console.warn('Background operations failed:', error)
        })
      } else {
        // For other profiles, just cache
        Promise.all([
          simpleCache.set('profile', profile, userId),
          simpleCache.set('grid_items', gridItems, userId),
          simpleCache.set('backlog_items', backlogItems, userId)
        ]).catch(error => {
          console.warn('Background operations failed:', error)
        })
      }
      
    } catch (error) {
      console.error('Failed to refresh grid:', error)
      setLoading(false)
    }
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
      setAddingNewRefTo(gridItems.length < 12 ? 'grid' : 'backlog')
      bottomSheetRef.current?.snapToIndex(1)
    }
  }, [hasShareIntent])

  useEffect(() => {
    const init = async () => {
      try {
        // Set focus ready immediately for faster perceived loading
        setFocusReady(true)
        
        await refreshGrid(userName)
        
        // If returning from a search context, grid is already ready
        const returningFromSearch = cachedSearchResults.length > 0 || isSearchResultsSheetOpen || searchMode
        if (returningFromSearch) {
          // Already set above
        } else if (justOnboarded) {
          // Only delay for the first post-registration landing where startup animation will play
          setTimeout(() => setFocusReady(true), 2500)
          // Reset flag so subsequent visits don't delay
          setJustOnboarded(false)
        } else {
          // Already set above for normal visits
        }
      } catch (error) {
        console.error('Failed to refresh grid:', error)
        // Even if there's an error, set focus ready to show something
        setFocusReady(true)
      }
    }

    // Initialize immediately without setTimeout
    init()
  }, [userName])

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
    const promptsActive = gridItems.length < 12 && !searchMode && !isSearchResultsSheetOpen && !loading
    const canShowPromptsNow = promptsActive && (startupAnimationDone || !(gridItems.length === 0))
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
  }, [gridItems.length, searchMode, isSearchResultsSheetOpen, startupAnimationDone, loading])

  // Direct photo picker flow - route into existing NewRefSheet with pre-populated photo
  const triggerDirectPhotoPicker = async (prompt: string) => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        return
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0]
        // Populate store so NewRefSheet picks it up as a photo prompt
        try { useAppStore.getState().setSelectedPhoto(selectedImage.uri) } catch {}
        try { useAppStore.getState().setAddRefPrompt(prompt) } catch {}
        // Open NewRefSheet directly at search-results height; it will switch to add step
        setAddingNewRefTo('grid')
        newRefSheetRef.current?.snapToIndex(1)
      }
    } catch (error) {
      console.error('Error picking image:', error)
    }
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
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
        {profile && (
          <View
            style={{
              flex: 1,
              width: '100%',
              marginHorizontal: s.$1half,
            }}
          >
            {/* Custom header text based on grid state */}
            <Animated.View
              entering={FadeIn.duration(400).delay(100)}
              exiting={FadeOut.duration(300)}
              key={`${searchMode}-${gridItems.length}`}
              style={{
                paddingHorizontal: 10,
                paddingVertical: s.$1,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 7, // Center the text between nav and grid for both modes
                zIndex: 5, // Above the overlay
              }}
            >
              {searchMode || isSearchResultsSheetOpen ? (
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
                    minHeight: s.$1half, // reserve space during pause
                  }}
                >
                  {showPrompt
                    ? promptTextIndex === 0
                      ? 'these prompts will disappear after you add'
                      : '(no one will know you used them)'
                    : ''}
                </Animated.Text>
              )}
            </Animated.View>

            <View
              style={{
                gap: s.$2,
                minHeight: 500,
                position: 'absolute',
                top: 90,
                left: 0,
                right: 0,
                zIndex: 5, // Above the overlay
              }}
            >
              {loading || !focusReady ? (
                <View style={{ height: 500 }} />
              ) : (
                <Grid
                  editingRights={true}
                  screenFocused={focusReady && !loading}
                  shouldAnimateStartup={justOnboarded}
                  onStartupAnimationComplete={() => setStartupAnimationDone(true)}
                  onPressItem={(item) => {
                    // Normal mode - open details
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
                      // Direct photo picker flow - bypass NewRefSheet entirely
                      triggerDirectPhotoPicker(prompt)
                    } else {
                      // Normal search flow through NewRefSheet
                      setAddingNewRefTo('grid')
                      useAppStore.getState().setAddRefPrompt(prompt)
                      newRefSheetRef.current?.snapToIndex(1)
                    }
                  }}
                  columns={3}
                  items={displayGridItems}
                  rows={4}
                  rowGap={(s.$075 as number) + 5}
                  searchMode={searchMode}
                  selectedRefs={selectedRefs}
                  setSelectedRefs={setSelectedRefs}
                  newlyAddedItemId={newlyAddedItemId}
                />
              )}

              {/* Floating Search Button pinned to grid wrapper */}
              <FloatingJaggedButton
                icon="plus"
                onPress={() => {
                  setAddingNewRefTo('grid')
                  try { useAppStore.getState().setAddRefPrompt('') } catch {}
                  newRefSheetRef.current?.snapToIndex(1)
                }}
                style={{
                  position: 'absolute',
                  bottom: s.$075,
                  right: s.$075,
                  zIndex: 5,
                  opacity: searchMode ? 0 : 1,
                }}
              />
            </View>

            {/* Backlog header below grid (temporarily disabled) */}
            {false && (
              <View
                style={{
                  marginTop: 660,
                  paddingVertical: s.$1,
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  paddingLeft: s.$1 + 6,
                }}
              >
                <Text
                  style={{
                    color: c.prompt,
                    fontSize: s.$09,
                    fontFamily: 'System',
                    fontWeight: '700',
                    textAlign: 'left',
                    lineHeight: s.$1half,
                  }}
                >
                  Backlog
                </Text>
              </View>
            )}

            {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}

            {/* Multiple pressable areas to dismiss search mode - avoiding the grid */}
            {searchMode && (
              <>
                {/* Top area above grid */}
                <Pressable
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 90, // Up to where grid starts
                    backgroundColor: 'transparent',
                    zIndex: 1,
                  }}
                  onPress={() => {
                    setSearchMode(false)
                    // Don't clear selectedRefs if we're returning from search
                    if (!searchMode) { // Changed from returningFromSearch to searchMode
                      setSelectedRefs([])
                    }
                  }}
                />
                {/* Left area beside grid */}
                <Pressable
                  style={{
                    position: 'absolute',
                    top: 90,
                    left: 0,
                    width: 16, // s.$08
                    bottom: 0,
                    backgroundColor: 'transparent',
                    zIndex: 1,
                  }}
                  onPress={() => {
                    setSearchMode(false)
                    // Don't clear selectedRefs if we're returning from search
                    if (!searchMode) { // Changed from returningFromSearch to searchMode
                      setSelectedRefs([])
                    }
                  }}
                />
                {/* Right area beside grid */}
                <Pressable
                  style={{
                    position: 'absolute',
                    top: 90,
                    right: 0,
                    width: 16, // s.$08
                    bottom: 0,
                    backgroundColor: 'transparent',
                    zIndex: 1,
                  }}
                  onPress={() => {
                    setSearchMode(false)
                    // Don't clear selectedRefs if we're returning from search
                    if (!searchMode) { // Changed from returningFromSearch to searchMode
                      setSelectedRefs([])
                    }
                  }}
                />
                {/* Bottom area below grid */}
                <Pressable
                  style={{
                    position: 'absolute',
                    top: 590, // 90 + 500 (grid height)
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'transparent',
                    zIndex: 1,
                  }}
                  onPress={() => {
                    setSearchMode(false)
                    // Don't clear selectedRefs if we're returning from search
                    if (!searchMode) { // Changed from returningFromSearch to searchMode
                      setSelectedRefs([])
                    }
                  }}
                />
              </>
            )}
          </View>
        )}

        {/* Logout button positioned absolutely */}
        {showLogoutButton && (
          <View style={{ 
            position: 'absolute',
            bottom: 50,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 4,
          }}>
            <Button
              style={{ width: 120 }}
              variant="inlineSmallMuted"
              title="Log out"
              onPress={logout}
            />
          </View>
        )}

        {profile && (
          <>
            <MyBacklogSheet
              backlogItems={backlogItems}
              profile={profile}
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
                profileUsername={profile.userName}
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
