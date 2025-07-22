import { pocketbase, useItemStore, useUserStore } from '@/features/pocketbase'
import { getBacklogItems, getProfileItems } from '@/features/pocketbase/stores/items'
import type { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { getPreloadedData } from '@/features/pocketbase/background-preloader'
import { performanceMonitor } from '@/features/pocketbase/performance-monitor'
import { c, s } from '@/features/style'
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
import { useUIStore } from '../state'
import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { ProfileHeader } from './ProfileHeader'
import { MyBacklogSheet } from './sheets/MyBacklogSheet'
import { RemoveRefSheet } from './sheets/RemoveRefSheet'
import ProfileSearchBottomSheet from './sheets/ProfileSearchBottomSheet'
import SearchModeBottomSheet from './sheets/SearchModeBottomSheet'
import SearchResultsSheet from './sheets/SearchResultsSheet'

export const MyProfile = ({ userName }: { userName: string }) => {
  const { hasShareIntent } = useShareIntentContext()
  const { startEditProfile, stopEditProfile, setAddingNewRefTo, addingNewRefTo, newRefSheetRef } =
    useUIStore()
  const insets = useSafeAreaInsets()

  const [profile, setProfile] = useState<ExpandedProfile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [editingRights, seteditingRights] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [searchMode, setSearchMode] = useState(false)

  const [isOpeningSearchResults, setIsOpeningSearchResults] = useState(false)
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false)
  const [restoredRefItems, setRestoredRefItems] = useState<any[]>([])

  const { user } = useUserStore()
  const { moveToBacklog, profileRefreshTrigger, remove } = useItemStore()
  const { returningFromSearch, setReturningFromSearch, selectedRefs, setSelectedRefs } = useUIStore()

  const [removingItem, setRemovingItem] = useState<ExpandedItem | null>(null)
  
  // Simple cache to avoid refetching the same data
  const lastFetchedUserName = useRef<string>('')
  const lastFetchedTrigger = useRef<number>(0)

  const refreshGrid = async (userName: string) => {
    // Check if we already have this data cached
    if (lastFetchedUserName.current === userName && lastFetchedTrigger.current === profileRefreshTrigger) {
      console.log('🚀 Using cached profile data for:', userName)
      return
    }
    
    performanceMonitor.startTimer('profile_load')
    console.log('🔄 Fetching profile data for:', userName)
    const startTime = Date.now()
    
    // Check for preloaded data first
    const cacheKey = `own-profile-${userName}-${profileRefreshTrigger}`
    const preloadedData = getPreloadedData(cacheKey)
    
    console.log('🔍 Checking preloaded data for key:', cacheKey)
    console.log('🔍 Preloaded data found:', !!preloadedData)
    
    if (preloadedData && preloadedData.gridItems) {
      console.log('🚀 Using preloaded data for:', userName)
      console.log('🔍 Preloaded profile:', preloadedData.profile?.userName)
      console.log('🔍 Preloaded grid items count:', preloadedData.gridItems?.length)
      setProfile(preloadedData.profile)
      setGridItems(preloadedData.gridItems || []) // Ensure we always set an array
      lastFetchedUserName.current = userName
      lastFetchedTrigger.current = profileRefreshTrigger
      const loadTime = Date.now() - startTime
      console.log(`✅ Profile loaded from cache in ${loadTime}ms for:`, userName)
      performanceMonitor.endTimer('profile_load', true)
      return
    }
    
    setLoading(true)
    try {
      // Make API calls parallel instead of sequential
      console.log('🔄 Starting parallel API calls...')
      const profileStartTime = Date.now()
      const gridStartTime = Date.now()
      
      const [profile, gridItems] = await Promise.all([
        (async () => {
      const profile = await pocketbase
        .collection('users')
        .getFirstListItem<ExpandedProfile>(`userName = "${userName}"`)
          const profileTime = Date.now() - profileStartTime
          console.log(`📊 Profile fetch took ${profileTime}ms`)
          console.log(`📊 Profile found:`, profile?.userName)
          return profile
        })(),
        (async () => {
          const gridItems = await getProfileItems(userName)
          const gridTime = Date.now() - gridStartTime
          console.log(`📊 Grid items fetch took ${gridTime}ms`)
          console.log(`📊 Grid items found:`, gridItems?.length)
          return gridItems || [] // Ensure we always return an array
        })()
      ])
      
      const setStateStartTime = Date.now()
      setProfile(profile)
      setGridItems(gridItems || []) // Ensure we always set an array
      const setStateTime = Date.now() - setStateStartTime
      console.log(`📊 setState took ${setStateTime}ms`)
      
      // Update cache
      lastFetchedUserName.current = userName
      lastFetchedTrigger.current = profileRefreshTrigger
      
      const loadTime = Date.now() - startTime
      console.log(`✅ Profile loaded in ${loadTime}ms for:`, userName)
      performanceMonitor.endTimer('profile_load', false)
      
      // Removed backlogItems fetch since it's not used in the UI
      // setBacklogItems(backlogItems as ExpandedItem[])
    } catch (error) {
      console.error('❌ Profile loading error:', error)
      performanceMonitor.endTimer('profile_load', false)
    } finally {
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
    await remove(removingItem.id)
    setRemovingItem(null)
    await refreshGrid(userName)
  }

  useEffect(() => {
    if (hasShareIntent) {
      setAddingNewRefTo((gridItems?.length || 0) < 12 ? 'grid' : 'backlog')
      bottomSheetRef.current?.snapToIndex(1)
    }
  }, [hasShareIntent, gridItems?.length])

  useEffect(() => {
    const init = async () => {
      try {
        await refreshGrid(userName)
        seteditingRights(pocketbase?.authStore?.record?.userName === userName)
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName, profileRefreshTrigger])

  const { logout } = useUserStore()

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const removeRefSheetRef = useRef<BottomSheet>(null)
  const searchResultsSheetRef = useRef<BottomSheet>(null)
  const searchResultsSheetTriggerRef = useRef<{ triggerSearch: () => void }>({ triggerSearch: () => {} })

  const stopEditing = useItemStore((state) => state.stopEditing)

  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)

  // timeout used to stop editing the profile after 10 seconds
  let timeout: ReturnType<typeof setTimeout>

  // Find selected ref items for thumbnails
  const selectedRefItems = useMemo(() => 
    (gridItems || []).filter(item => selectedRefs.includes(item.id)), 
    [gridItems, selectedRefs]
  )

  // Check if we're returning from a search result and should open search results sheet
  useEffect(() => {
    if (returningFromSearch && selectedRefs.length > 0 && !loading && gridItems.length > 0) {
      setIsOpeningSearchResults(true)
      setSearchMode(false)
      // Add a small delay to ensure proper state updates
      setTimeout(() => {
        searchResultsSheetRef.current?.snapToIndex(0)
        setReturningFromSearch(false)
        // Reset the flag after a longer delay
        setTimeout(() => setIsOpeningSearchResults(false), 200)
      }, 50)
    } else if (returningFromSearch && selectedRefs.length === 0) {
      setReturningFromSearch(false)
    }
  }, [returningFromSearch, selectedRefs, setReturningFromSearch, loading, gridItems?.length || 0])

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
            <View style={{ 
              paddingVertical: s.$3, 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: s.$8 
            }}>
              <Text
                style={{ 
                  color: c.inactive, 
                  fontWeight: '300', // lighter font weight
                  fontSize: 16,
                  textAlign: 'center',
                  fontFamily: undefined, // use system font
                  paddingHorizontal: s.$2,
                  lineHeight: 21,
                  width: '100%',
                  maxWidth: '98%',
                  alignSelf: 'center',
                }}
              >
                {searchMode
                  ? 'search at the intersection of...'
                  : `these prompts will disappear after you add\n... no one will ever know`}
              </Text>
            </View>

            <View style={{ gap: s.$2 }}>
              {loading ? (
                <PlaceholderGrid columns={3} rows={4} />
              ) : (
                <Grid
                  editingRights={editingRights}
                  onPressItem={(item) => {
                    setDetailsItem(item!)
                    detailsSheetRef.current?.snapToIndex(0)
                  }}
                  onLongPressItem={() => {
                    if (editingRights) {
                      clearTimeout(timeout)
                      timeout = setTimeout(() => {
                        stopEditProfile()
                      }, 10000)
                      startEditProfile()
                    }
                  }}
                  onRemoveItem={(item) => {
                    setRemovingItem(item)
                    removeRefSheetRef.current?.expand()
                  }}
                  onAddItem={(prompt?: string) => {
                    setAddingNewRefTo('grid')
                    if (prompt) useUIStore.getState().setAddRefPrompt(prompt)
                    newRefSheetRef.current?.snapToIndex(1)
                  }}
                  onAddItemWithPrompt={(prompt: string) => {
                    setAddingNewRefTo('grid')
                    useUIStore.getState().setAddRefPrompt(prompt)
                    newRefSheetRef.current?.snapToIndex(1)
                  }}
                  columns={3}
                  items={gridItems || []}
                  rows={4}
                  searchMode={searchMode}
                  selectedRefs={selectedRefs}
                  setSelectedRefs={setSelectedRefs}
                />
              )}

              <View style={{ marginBottom: s.$2, alignItems: 'center' }}>
                {/*
                <Button
                  style={{ width: 20 }}
                  variant="inlineSmallMuted"
                  title="Log out"
                  onPress={logout}
                />
                */}
              </View>
            </View>
          </View>
        )}

        {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}
      </ScrollView>

      {/* Removed problematic overlay - will handle exit differently */}

      {/* Floating Search Button (toggle search mode) - only show when no sheets are open */}
      {!searchMode && (
        <FloatingJaggedButton
          onPress={() => {
            console.log('🔍 FloatingJaggedButton pressed - entering search mode')
            setSelectedRefs([]) // Clear selected refs when entering search mode
            useUIStore.getState().clearCachedSearchResults() // Clear cached search results
            setSearchMode(true)
          }}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 24,
            right: 24,
            zIndex: 1, // Consistent z-index
            elevation: 1, // Consistent elevation
          }}
        />
      )}

      {/* Search Bottom Sheet (only in search mode, always rendered last) */}
      {searchMode && (
        <SearchModeBottomSheet
          open={false} // start in low position
          onClose={() => setSearchMode(false)}
          selectedRefs={selectedRefs}
          selectedRefItems={selectedRefItems}
          onSearch={() => {
            console.log('🔍 Search button clicked in SearchModeBottomSheet')
            searchResultsSheetRef.current?.snapToIndex(0)
            setSearchMode(false) // Exit search mode when opening search results
            // Trigger the search after a small delay to ensure the sheet is open
            setTimeout(() => {
              console.log('⏰ Timeout triggered, calling triggerSearch:', !!searchResultsSheetTriggerRef.current)
              if (searchResultsSheetTriggerRef.current) {
                console.log('🎯 Calling triggerSearch function')
                searchResultsSheetTriggerRef.current.triggerSearch()
              } else {
                console.log('❌ searchResultsSheetTriggerRef.current is null')
              }
            }, 100)
          }}
          onRestoreSearch={async (historyItem) => {
            try {
              console.log('🔄 Restoring search from history:', historyItem.id)
              
              // Fetch the stored search results from history
              const response = await fetch(`http://localhost:8000/search-history/${user?.id}/restore/${historyItem.id}`)
              if (response.ok) {
                const storedResults = await response.json()
                console.log('✅ Retrieved stored results:', storedResults.people?.length, 'people')
                
                // Set the cached search results in the UI store
                useUIStore.getState().setCachedSearchResults(
                  storedResults.people || [],
                  'People into', // Use our desired title instead of stored title
                  'Browse, dm, or add to a group' // Use our desired subtitle instead of stored subtitle
                )
                
                // Set the selected refs from the history item
                setSelectedRefs(historyItem.ref_ids)
                
                // Fetch the actual ref items from PocketBase for thumbnails
                try {
                  const { pocketbase } = await import('@/features/pocketbase/pocketbase')
                  const refItems = await pocketbase.collection('refs').getFullList({
                    filter: historyItem.ref_ids.map(id => `id = "${id}"`).join(' || '),
                    fields: 'id,title,image'
                  })
                  console.log('📦 Fetched ref items for thumbnails:', refItems.length)
                  
                  // Convert refs to item format for the search results sheet
                  const restoredItems = refItems.map(ref => ({
                    id: ref.id,
                    title: ref.title,
                    image: ref.image,
                    ref: ref.id // Add ref field for compatibility
                  }))
                  
                  // Store the restored ref items
                  setRestoredRefItems(restoredItems)
                } catch (error) {
                  console.error('❌ Error fetching ref items for thumbnails:', error)
                  setRestoredRefItems([])
                }
                
                // Add a small delay to ensure cached results are set before opening sheet
                setTimeout(() => {
                  console.log('🚀 Opening search results with cached data')
                  searchResultsSheetRef.current?.snapToIndex(0)
                  setSearchMode(false)
                }, 100)
              } else {
                console.error('❌ Failed to restore search from history:', response.status)
                // Fallback: just set the refs and let it do a new search
                setSelectedRefs(historyItem.ref_ids)
                searchResultsSheetRef.current?.snapToIndex(0)
                setSearchMode(false)
              }
            } catch (error) {
              console.error('❌ Error restoring search from history:', error)
              // Fallback: just set the refs and let it do a new search
              setSelectedRefs(historyItem.ref_ids)
              searchResultsSheetRef.current?.snapToIndex(0)
              setSearchMode(false)
            }
          }}
        />
      )}
      
      {/* Search Results Sheet */}
      <SearchResultsSheet
        bottomSheetRef={searchResultsSheetRef}
        selectedRefs={selectedRefs}
        selectedRefItems={restoredRefItems.length > 0 ? restoredRefItems : selectedRefItems}
        onSheetStateChange={setIsSearchResultsOpen}
        searchTriggerRef={searchResultsSheetTriggerRef}
      />
      
      {profile && (
        <>
          {/* <MyBacklogSheet
            backlogItems={backlogItems}
            profile={profile}
            user={user}
            openAddtoBacklog={() => {
              setAddingNewRefTo('backlog')
              newRefSheetRef.current?.snapToIndex(1)
            }}
          /> */}
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
        </>
      )}
    </>
  )
}
