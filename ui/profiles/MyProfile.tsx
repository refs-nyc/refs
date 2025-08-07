import { useAppStore } from '@/features/stores'
import { getBacklogItems, getProfileItems } from '@/features/stores/items'
import type { Profile } from '@/features/types'
import { ExpandedItem } from '@/features/types'
import { s, c } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { useShareIntentContext } from 'expo-share-intent'
import { useEffect, useRef, useState, useMemo } from 'react'
import { ScrollView, View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FloatingJaggedButton from '../buttons/FloatingJaggedButton'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { Button } from '@/ui'

import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { MyBacklogSheet } from './sheets/MyBacklogSheet'
import { RemoveRefSheet } from './sheets/RemoveRefSheet'
import SearchModeBottomSheet from './sheets/SearchModeBottomSheet'
import SearchResultsSheet, { SearchResultsSheetRef } from './sheets/SearchResultsSheet'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const MyProfile = ({ userName }: { userName: string }) => {
  const { hasShareIntent } = useShareIntentContext()
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<Profile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)


  const {
    user,
    getUserByUserName,
    moveToBacklog,
    profileRefreshTrigger,
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
  } = useAppStore()

  const [removingItem, setRemovingItem] = useState<ExpandedItem | null>(null)
  const [promptTextIndex, setPromptTextIndex] = useState(0)

  // Refs
  const searchResultsSheetRef = useRef<BottomSheet>(null)
  const isExpandingSheetRef = useRef(false) // Track if we're already expanding the sheet
  const searchResultsSheetTriggerRef = useRef<SearchResultsSheetRef>(null)

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
      // Fetch data in parallel for better performance (non-blocking)
      Promise.all([
        getUserByUserName(userName),
        getProfileItems(userName),
        getBacklogItems(userName),
      ])
        .then(([profile, gridItems, backlogItems]) => {
          setProfile(profile)
          setGridItems(gridItems)
          setBacklogItems(backlogItems as ExpandedItem[])
          setLoading(false)
        })
        .catch((error) => {
          console.error('Failed to refresh grid:', error)
          setLoading(false)
        })
    } catch (error) {
      console.error('Failed to refresh grid:', error)
      setLoading(false)
    }
  }

  const handleMoveToBacklog = async () => {
    if (!removingItem) return
    try {
      removeRefSheetRef.current?.close()
      const updatedRecord = await moveToBacklog(removingItem?.id)
      setRemovingItem(null)
      await refreshGrid(userName)
    } catch (error) {
      console.error(error)
    }
  }

  const handleRemoveFromProfile = async () => {
    if (!removingItem) return
    removeRefSheetRef.current?.close()
    await removeItem(removingItem.id)
    setRemovingItem(null)
    await refreshGrid(userName)
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
        await refreshGrid(userName)
      } catch (error) {
        console.error('Failed to refresh grid:', error)
      }
    }

    // Make initialization non-blocking
    setTimeout(() => {
      init()
    }, 0)
  }, [userName, profileRefreshTrigger])

  // Simplified back button restoration logic - just reset sheet state
  useEffect(() => {
    console.log('🔍 MyProfile restoration effect triggered:', {
      cachedSearchResultsLength: cachedSearchResults.length,
      searchMode,
      isSearchResultsSheetOpen,
      userName
    })
    
    // If we have cached search results and we're on the profile page, reset sheet state
    if (cachedSearchResults.length > 0 && !searchMode) {
      // Reset the sheet open state if it's incorrectly set to true
      if (isSearchResultsSheetOpen) {
        console.log('🔍 Resetting incorrect sheet open state')
        setSearchResultsSheetOpen(false)
      }
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

  // Animate prompt text when grid has prompts
  useEffect(() => {
    if (gridItems.length < 12 && !searchMode && !isSearchResultsSheetOpen) {
      const interval = setInterval(() => {
        setPromptTextIndex(prev => (prev + 1) % 2)
      }, 3000) // 3 seconds per text

      return () => clearInterval(interval)
    } else {
      setPromptTextIndex(0) // Reset when not showing prompts
    }
  }, [gridItems.length, searchMode, isSearchResultsSheetOpen])

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
                    color: c.muted,
                    fontSize: s.$09,
                    fontFamily: 'System',
                    fontWeight: '400',
                    textAlign: 'center',
                    lineHeight: s.$1half,
                  }}
                >
                  searching at the intersection of...
                </Text>
              ) : gridItems.length >= 12 ? (
                <Text
                  style={{
                    color: c.muted,
                    fontSize: s.$09,
                    fontFamily: 'System',
                    fontWeight: '400',
                    textAlign: 'center',
                    lineHeight: s.$1half,
                  }}
                >
                  pick some refs, find people in the middle
                </Text>
              ) : (
                <Animated.Text
                  entering={FadeIn.duration(600)}
                  exiting={FadeOut.duration(600)}
                  key={`prompt-text-${promptTextIndex}`}
                  style={{
                    color: '#B0B0B0',
                    fontSize: s.$09,
                    fontFamily: 'System',
                    fontWeight: '400',
                    textAlign: 'center',
                    lineHeight: s.$1half,
                    minWidth: 280, // Expanded width to fit text on one line
                  }}
                >
                  {promptTextIndex === 0 
                    ? 'These prompts will disappear after you add...'
                    : 'no one will ever know'
                  }
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
              {loading ? (
                <PlaceholderGrid columns={3} rows={4} />
              ) : (
                <Grid
                  editingRights={true}
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
                  onAddItemWithPrompt={(prompt: string) => {
                    setAddingNewRefTo('grid')
                    useAppStore.getState().setAddRefPrompt(prompt)
                    newRefSheetRef.current?.snapToIndex(1)
                  }}
                  columns={3}
                  items={gridItems}
                  rows={4}
                  searchMode={searchMode}
                  selectedRefs={selectedRefs}
                  setSelectedRefs={setSelectedRefs}
                />
              )}
            </View>

            {/* Floating Search Button (toggle search mode) - positioned absolutely */}
            <FloatingJaggedButton
              onPress={() => {
                // Don't clear selectedRefs if we're returning from search
                if (!searchMode) { // Changed from returningFromSearch to searchMode
                  setSelectedRefs([]) // Clear selected refs when entering search mode
                }
                clearCachedSearchResults() // Clear cached search results
                setSearchMode(true)
              }}
              style={{
                position: 'absolute',
                bottom: -20, // Fixed distance from bottom of screen
                right: 5, // Fixed distance from right edge of screen
                zIndex: 5, // Behind the sheet (zIndex: 100) but above the grid content
                opacity: searchMode ? 0 : 1, // Hide with opacity instead of conditional rendering
              }}
            />
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
      </ScrollView>

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
                  console.log('🔄 Restoring search from history with refs:', historyItem.ref_ids)
                  
                  // Create ref items from history data with images
                  const restoredItems = historyItem.ref_ids.map((refId: string, index: number) => ({
                    id: refId,
                    ref: refId,
                    image: historyItem.ref_images?.[index] || '',
                    title: historyItem.ref_titles?.[index] || refId,
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
                    } else {
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
    </>
  )
}
