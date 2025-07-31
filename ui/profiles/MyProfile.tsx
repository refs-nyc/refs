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
import { router } from 'expo-router'
import { Button } from '../buttons/Button'
import FloatingJaggedButton from '../buttons/FloatingJaggedButton'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'

import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { ProfileHeader } from './ProfileHeader'
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
  const [isOpeningSearchResults, setIsOpeningSearchResults] = useState(false)
  const [restoredRefItems, setRestoredRefItems] = useState<any[]>([])

  const {
    user,
    getUserByUserName,
    moveToBacklog,
    profileRefreshTrigger,
    removeItem,
    startEditProfile,
    stopEditProfile,
    setAddingNewRefTo,
    newRefSheetRef,
    searchMode,
    selectedRefs,
    selectedRefItems: globalSelectedRefItems,
    returningFromSearch,
    returningFromSearchViaBackButton,
    cachedSearchResults,
    isSearchResultsSheetOpen,
    setSearchMode,
    setSelectedRefs,
    setSelectedRefItems: setGlobalSelectedRefItems,
    setReturningFromSearch,
    setReturningFromSearchViaBackButton,
    clearCachedSearchResults,
  } = useAppStore()

  const [removingItem, setRemovingItem] = useState<ExpandedItem | null>(null)
  
  // Search-related refs
  const searchResultsSheetRef = useRef<BottomSheet>(null)
  const searchResultsSheetTriggerRef = useRef<SearchResultsSheetRef>(null)
  
  // Simple cache to avoid refetching the same data
  const lastFetchedUserName = useRef<string>('')
  const lastFetchedTrigger = useRef<number>(0)

  // Memoized grid items map for O(1) lookup
  const gridItemsMap = useMemo(() => 
    new Map(gridItems.map(item => [item.id, item])), 
    [gridItems]
  )

  // Memoized selectedRefItems computation for better performance
  const selectedRefItems = useMemo(() => {
    if (selectedRefs.length === 0 || gridItems.length === 0) {
      return []
    }
    
    return selectedRefs
      .map(id => gridItemsMap.get(id))
      .filter(Boolean) as ExpandedItem[]
  }, [selectedRefs, gridItemsMap])

  // Debug: Log what selectedRefItems are being passed to SearchResultsSheet
  const finalSelectedRefItems = restoredRefItems.length > 0 ? restoredRefItems : (globalSelectedRefItems.length > 0 ? globalSelectedRefItems : selectedRefItems)
  
  useEffect(() => {
    console.log('🔍 MyProfile: Final selectedRefItems for SearchResultsSheet:', {
      restoredRefItemsLength: restoredRefItems.length,
      globalSelectedRefItemsLength: globalSelectedRefItems.length,
      selectedRefItemsLength: selectedRefItems.length,
      finalLength: finalSelectedRefItems.length,
      finalItems: finalSelectedRefItems.slice(0, 2)
    })
  }, [restoredRefItems, globalSelectedRefItems, selectedRefItems, finalSelectedRefItems])

  const refreshGrid = async (userName: string) => {
    setLoading(true)
    try {
      // Fetch data in parallel for better performance (non-blocking)
      Promise.all([
        getUserByUserName(userName),
        getProfileItems(userName),
        getBacklogItems(userName)
      ]).then(([profile, gridItems, backlogItems]) => {
        setProfile(profile)
        setGridItems(gridItems)
        setBacklogItems(backlogItems as ExpandedItem[])
        setLoading(false)
      }).catch(error => {
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

  // Check if we're returning from a search result and should open search results sheet
  useEffect(() => {
    console.log('🔍 MyProfile useEffect - returningFromSearch:', returningFromSearch)
    console.log('🔍 MyProfile useEffect - returningFromSearchViaBackButton:', returningFromSearchViaBackButton)
    console.log('🔍 MyProfile useEffect - selectedRefs:', selectedRefs.length)
    console.log('🔍 MyProfile useEffect - cachedSearchResults:', cachedSearchResults.length)
    console.log('🔍 MyProfile useEffect - loading:', loading)
    console.log('🔍 MyProfile useEffect - gridItems:', gridItems.length)
    
         // Debug: Log the condition check
     console.log('🔍 MyProfile: Should open search results?', {
       returningFromSearchViaBackButton,
       returningFromSearch,
       selectedRefsLength: selectedRefs.length,
       cachedResultsLength: cachedSearchResults.length,
       loading,
       gridItemsLength: gridItems.length,
       isOpeningSearchResults
     })
     
     // Debug: Check each condition individually
     if (returningFromSearchViaBackButton) {
       console.log('🔍 MyProfile: Condition check - returningFromSearchViaBackButton: ✅')
       console.log('🔍 MyProfile: Condition check - returningFromSearch:', returningFromSearch ? '✅' : '❌')
       console.log('🔍 MyProfile: Condition check - selectedRefs.length > 0:', selectedRefs.length > 0 ? '✅' : '❌')
       console.log('🔍 MyProfile: Condition check - !loading:', !loading ? '✅' : '❌')
       console.log('🔍 MyProfile: Condition check - gridItems.length > 0:', gridItems.length > 0 ? '✅' : '❌')
       console.log('🔍 MyProfile: Condition check - !isOpeningSearchResults:', !isOpeningSearchResults ? '✅' : '❌')
     }
    
    // Only open search results if we're returning via back button specifically
    if (!returningFromSearchViaBackButton) {
      // Clear the general returningFromSearch flag if we're not coming via back button
      if (returningFromSearch) {
        console.log('🔍 MyProfile: Clearing returningFromSearch (not via back button)')
        setReturningFromSearch(false)
      }
      return
    }
    
               // If returning from search but selectedRefs is empty, try to reconstruct from cached results
           if (returningFromSearch && selectedRefs.length === 0 && cachedSearchResults.length > 0) {
             console.log('🔍 MyProfile: Reconstructing selectedRefs from cached results')
             // Extract ref IDs from cached search results
             const refIds = cachedSearchResults.map(result => result.id).filter(Boolean)
             if (refIds.length > 0) {
               setSelectedRefs(refIds)
               console.log('🔍 MyProfile: Reconstructed selectedRefs:', refIds.length)
               
               // Also restore the ref items for thumbnails and share button
               // We need to get the ref items from the search history, not cachedSearchResults
               // For now, let's try to reconstruct from the selectedRefs and gridItems
               if (selectedRefs.length > 0 && gridItems.length > 0) {
                 const restoredItems = selectedRefs.map(refId => {
                   const gridItem = gridItems.find(item => item.id === refId)
                   return {
                     id: refId,
                     ref: refId,
                     image: gridItem?.image || '',
                     title: gridItem?.expand?.ref?.title || refId,
                     expand: {
                       ref: {
                         id: refId,
                         title: gridItem?.expand?.ref?.title || refId,
                         image: gridItem?.image || ''
                       }
                     }
                   }
                 }).filter(Boolean)
                 
                 console.log('🔍 MyProfile: Restoring ref items for thumbnails from gridItems:', restoredItems.length)
                 console.log('🔍 MyProfile: restoredItems sample:', restoredItems.slice(0, 2))
                 setRestoredRefItems(restoredItems)
                 setGlobalSelectedRefItems(restoredItems) // Also set in global state
               }
               
               return // Exit early, let the next useEffect run handle opening the sheet
             }
           }
    
               if (returningFromSearch && selectedRefs.length > 0 && !loading && gridItems.length > 0 && !isOpeningSearchResults) {
             console.log('🔍 MyProfile: Opening search results sheet - ALL CONDITIONS MET')
             console.log('🔍 MyProfile: selectedRefs.length:', selectedRefs.length)
             console.log('🔍 MyProfile: loading:', loading)
             console.log('🔍 MyProfile: gridItems.length:', gridItems.length)
             console.log('🔍 MyProfile: isOpeningSearchResults:', isOpeningSearchResults)
             setIsOpeningSearchResults(true)
             setSearchMode(false)
             // Add a small delay to ensure proper state updates
             setTimeout(() => {
               if (searchResultsSheetRef.current) {
                 try {
                   searchResultsSheetRef.current.snapToIndex(1)
                 } catch (error) {
                   console.log('🔍 Error opening search results sheet:', error)
                   // Fallback: try index 0 if index 1 fails
                   try {
                     searchResultsSheetRef.current.snapToIndex(0)
                   } catch (fallbackError) {
                     console.log('🔍 Fallback also failed:', fallbackError)
                   }
                 }
               }
               // Clear the back button flag after opening the sheet
               setReturningFromSearchViaBackButton(false)
               // Reset the flag after a longer delay
               setTimeout(() => setIsOpeningSearchResults(false), 200)
             }, 50)
    } else if (returningFromSearch && selectedRefs.length === 0 && cachedSearchResults.length === 0) {
      console.log('🔍 MyProfile: Clearing returningFromSearch (no selected refs and no cached results)')
      setReturningFromSearch(false)
      setReturningFromSearchViaBackButton(false)
    }
  }, [returningFromSearch, returningFromSearchViaBackButton, selectedRefs, cachedSearchResults, setReturningFromSearch, setReturningFromSearchViaBackButton, setSelectedRefs, loading, gridItems?.length || 0])

  // Reset search mode when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // Cleanup: reset search mode when leaving the screen
      // But preserve selectedRefs if we're returning from search
      setSearchMode(false)
      // Don't clear selectedRefs here - let the returningFromSearch logic handle it
    }
  }, [setSearchMode])

  const { stopEditing } = useAppStore()

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const removeRefSheetRef = useRef<BottomSheet>(null)

  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)

  // timeout used to stop editing the profile after 10 seconds
  let timeout: ReturnType<typeof setTimeout>

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
                marginTop: searchMode ? 14 : 0,
                zIndex: 5 // Above the overlay
              }}
            >

              <Text 
                style={{ 
                  color: gridItems.length < 12 ? '#B0B0B0' : c.muted, 
                  fontSize: s.$09, 
                  fontFamily: 'System',
                  fontWeight: '300',
                  textAlign: 'center',
                  lineHeight: s.$1half
                }}
              >
                {(searchMode || isSearchResultsSheetOpen)
                  ? "searching at the intersection of..." 
                  : gridItems.length >= 12 
                    ? "pick some refs, find people in the middle" 
                    : "These prompts will disappear after you add...no one will ever know"
                }
              </Text>
            </Animated.View>

            <View style={{ 
              gap: s.$2, 
              minHeight: 500,
              position: 'absolute',
              top: 90,
              left: 0,
              right: 0,
              zIndex: 5, // Above the overlay
            }}>
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



              {/* Floating Search Button (toggle search mode) - positioned relative to grid content */}
              <FloatingJaggedButton
                onPress={() => {
                  // Don't clear selectedRefs if we're returning from search
                  if (!returningFromSearch) {
                    setSelectedRefs([]) // Clear selected refs when entering search mode
                  }
                  clearCachedSearchResults() // Clear cached search results
                  setSearchMode(true)
                }}

                style={{
                  position: 'absolute',
                  bottom: insets.bottom - 40, // Moved down by 30px (was -30, now -60)
                  right: -2, // 10px to the right (24 - 10)
                  zIndex: 5, // Behind the sheet (zIndex: 100) but above the grid content
                  opacity: searchMode ? 0 : 1, // Hide with opacity instead of conditional rendering
                }}
              />



            </View>
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
                if (!returningFromSearch) {
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
                if (!returningFromSearch) {
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
                if (!returningFromSearch) {
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
                if (!returningFromSearch) {
                  setSelectedRefs([])
                }
              }}
            />
          </>
        )}
      </ScrollView>

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
                console.log('🔍 Search triggered with selectedRefs:', selectedRefs)
                console.log('🔍 Selected ref items:', selectedRefItems)
                // Clear restored ref items for new searches
                setRestoredRefItems([])
                searchResultsSheetRef.current?.snapToIndex(1)
                setSearchMode(false) // Exit search mode when opening search results
                // Trigger the search after a small delay to ensure the sheet is open
                setTimeout(() => {
                  if (searchResultsSheetTriggerRef.current) {
                    console.log('🔍 Calling triggerSearch...')
                    searchResultsSheetTriggerRef.current.triggerSearch()
                  } else {
                    console.log('❌ searchResultsSheetTriggerRef.current is null')
                  }
                }, 300) // Increased delay to ensure sheet is fully open
              }}
              onRestoreSearch={async (historyItem) => {
                try {
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
                        image: historyItem.ref_images?.[index] || ''
                      }
                    }
                  }))
                  
                  console.log('🔄 Restoring ref items from history:', restoredItems)
                  setRestoredRefItems(restoredItems)
                  
                  // Open the search results sheet immediately
                  searchResultsSheetRef.current?.snapToIndex(1)
                  setSearchMode(false)
                  
                  // Use the cached search results from history
                  setTimeout(() => {
                    if (searchResultsSheetTriggerRef.current) {
                      console.log('🔄 Restoring search from history...')
                      searchResultsSheetTriggerRef.current.restoreSearchFromHistory(historyItem)
                    } else {
                      console.log('❌ searchResultsSheetTriggerRef.current is null')
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
