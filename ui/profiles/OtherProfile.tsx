import { pocketbase, useItemStore, useUserStore } from '@/features/pocketbase'
import { getBacklogItems, getProfileItems } from '@/features/pocketbase/stores/items'
import type { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { getPreloadedData } from '@/features/pocketbase/background-preloader'
import { s } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { useEffect, useRef, useState, useMemo } from 'react'
import { ScrollView, View } from 'react-native'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { ProfileHeader } from './ProfileHeader'
import { OtherBacklogSheet } from './sheets/OtherBacklogSheet'
import { OtherButtonsSheet } from './sheets/OtherButtonsSheet'

export const OtherProfile = ({ userName }: { userName: string }) => {
  const [profile, setProfile] = useState<ExpandedProfile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const { profileRefreshTrigger } = useItemStore()
  const { user } = useUserStore()
  
  // Simple cache to avoid refetching the same data
  const lastFetchedUserName = useRef<string>('')
  const lastFetchedTrigger = useRef<number>(0)

  const refreshGrid = async (userName: string) => {
    // Check if we already have this data cached
    if (lastFetchedUserName.current === userName && lastFetchedTrigger.current === profileRefreshTrigger) {
      console.log('🚀 Using cached profile data for:', userName)
      return
    }
    
    console.log('🔄 Fetching profile data for:', userName)
    const startTime = Date.now()
    
    // Check for preloaded data first (try both other-profile and search-result-profile)
    const otherProfileKey = `other-profile-${userName}-${profileRefreshTrigger}`
    const searchResultKey = `search-result-profile-${user?.id || 'unknown'}`
    const preloadedData = getPreloadedData(otherProfileKey) || getPreloadedData(searchResultKey)
    
    if (preloadedData) {
      console.log('🚀 Using preloaded data for:', userName)
      setProfile(preloadedData.profile)
      setGridItems(preloadedData.gridItems)
      lastFetchedUserName.current = userName
      lastFetchedTrigger.current = profileRefreshTrigger
      const loadTime = Date.now() - startTime
      console.log(`✅ Profile loaded from cache in ${loadTime}ms for:`, userName)
      return
    }
    
    setLoading(true)
    try {
      // Make API calls parallel instead of sequential
      const [profile, gridItems] = await Promise.all([
        pocketbase
        .collection('users')
          .getFirstListItem<ExpandedProfile>(`userName = "${userName}"`),
        getProfileItems(userName)
      ])
      
      setProfile(profile)
      setGridItems(gridItems)

      // Update cache
      lastFetchedUserName.current = userName
      lastFetchedTrigger.current = profileRefreshTrigger
      
      const loadTime = Date.now() - startTime
      console.log(`✅ Profile loaded in ${loadTime}ms for:`, userName)
      
      // Removed backlogItems fetch since it's not used in the UI
      // setBacklogItems(backlogItems as ExpandedItem[])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        await refreshGrid(userName)
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName, profileRefreshTrigger])

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const backlogSheetRef = useRef<BottomSheet>(null)

  const stopEditing = useItemStore((state) => state.stopEditing)

  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)

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
            <ProfileHeader profile={profile} />

            <View style={{ gap: s.$2 }}>
              {loading ? (
                <PlaceholderGrid columns={3} rows={4} />
              ) : (
                <Grid
                  columns={3}
                  items={gridItems}
                  rows={4}
                  onPressItem={(item) => {
                    setDetailsItem(item!)
                    detailsSheetRef.current?.snapToIndex(0)
                  }}
                />
              )}
            </View>
          </View>
        )}

        {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}
      </ScrollView>
      {profile && (
        <>
          <OtherButtonsSheet
            bottomSheetRef={bottomSheetRef}
            profile={profile}
            user={user}
            openBacklogSheet={() => {
              backlogSheetRef.current?.snapToIndex(0)
            }}
          />
          <OtherBacklogSheet
            bottomSheetRef={backlogSheetRef}
            backlogItems={backlogItems}
            profile={profile}
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
