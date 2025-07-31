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
    returningFromSearch,
    setSearchMode,
    setSelectedRefs,
    setReturningFromSearch,
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
    if (returningFromSearch && selectedRefs.length > 0 && !loading && gridItems.length > 0) {
      setIsOpeningSearchResults(true)
      setSearchMode(false)
      // Add a small delay to ensure proper state updates
      setTimeout(() => {
        searchResultsSheetRef.current?.snapToIndex(1)
        setReturningFromSearch(false)
        // Reset the flag after a longer delay
        setTimeout(() => setIsOpeningSearchResults(false), 200)
      }, 50)
    } else if (returningFromSearch && selectedRefs.length === 0) {
      setReturningFromSearch(false)
    }
  }, [returningFromSearch, selectedRefs, setReturningFromSearch, loading, gridItems?.length || 0])

  // Reset search mode when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // Cleanup: reset search mode when leaving the screen
      setSearchMode(false)
      setSelectedRefs([])
    }
  }, [setSearchMode, setSelectedRefs])

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
            <View style={{ 
              paddingHorizontal: 10, 
              paddingVertical: s.$1,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text style={{ 
                color: c.muted, 
                fontSize: s.$09, 
                fontFamily: 'System',
                fontWeight: '300',
                textAlign: 'center',
                lineHeight: s.$1half
              }}>
                {searchMode 
                  ? "searching at the intersection of..." 
                  : gridItems.length >= 12 
                    ? "pick some refs, find people in the middle" 
                    : "These prompts will disappear after you add...no one will know you used them"
                }
              </Text>
            </View>

            <View style={{ gap: s.$2 }}>
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
                  setSelectedRefs([]) // Clear selected refs when entering search mode
                  clearCachedSearchResults() // Clear cached search results
                  setSearchMode(true)
                }}

                style={{
                  position: 'absolute',
                  bottom: insets.bottom - 30, // 50px lower (24 - 50 = -26)
                  right: 9, // 10px to the right (24 - 10)
                  zIndex: 5, // Behind the sheet (zIndex: 100) but above the grid content
                  opacity: searchMode ? 0 : 1, // Hide with opacity instead of conditional rendering
                }}
              />

            </View>
          </View>
        )}

        {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}
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
            selectedRefItems={restoredRefItems.length > 0 ? restoredRefItems : selectedRefItems}
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
