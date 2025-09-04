import { useAppStore } from '@/features/stores'
import { getBacklogItems, getProfileItems } from '@/features/stores/items'
import type { Profile } from '@/features/types'
import { ExpandedItem } from '@/features/types'
import { s } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { ProfileHeader } from './ProfileHeader'
import { OtherBacklogSheet } from './sheets/OtherBacklogSheet'
import { OtherButtonsSheet } from './sheets/OtherButtonsSheet'
import { simpleCache } from '@/features/cache/simpleCache'
import { pocketbase } from '@/features/pocketbase'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const OtherProfile = ({ userName }: { userName: string }) => {
  const [profile, setProfile] = useState<Profile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const { user, stopEditing, getUserByUserName } = useAppStore()

  const refreshGrid = async (userName: string) => {
    setLoading(true)
    try {
      // First, try to get cached profile data to extract userId
      // This avoids the database query if we have cached data
      let cachedProfile: any = null
      let cachedGridItems: any = null
      let cachedBacklogItems: any = null
      
      // Try to find cached data by checking if we have any cached profiles
      // We'll use a simple approach: try to get profile data without userId first
      const allKeys = await AsyncStorage.getAllKeys()
      const profileKeys = allKeys.filter(key => key.includes('simple_cache_profile_'))
      
      if (profileKeys.length > 0) {
        // We have some cached profiles, let's check if any match our userName
        for (const key of profileKeys) {
          try {
            const cached = await AsyncStorage.getItem(key)
            if (cached) {
              const entry = JSON.parse(cached)
              const profile = entry.data
              if (profile.userName === userName && profile._cachedUserId) {
                // Found a cached profile for this user with userId embedded
                const userId = profile._cachedUserId
                console.log(`📖 Found cached profile for ${userName} with userId ${userId}`)
                
                // Now we can access the cache using the userId
                const results = await Promise.all([
                  simpleCache.get('profile', userId),
                  simpleCache.get('grid_items', userId),
                  simpleCache.get('backlog_items', userId)
                ])
                
                cachedProfile = results[0]
                cachedGridItems = results[1]
                cachedBacklogItems = results[2]
                
                if (cachedProfile && cachedGridItems && cachedBacklogItems) {
                  console.log('📖 Using cached other profile data')
                  setProfile(cachedProfile as Profile)
                  setGridItems(cachedGridItems as ExpandedItem[])
                  setBacklogItems(cachedBacklogItems as ExpandedItem[])
                  setLoading(false)
                  return
                }
                break
              }
            }
          } catch (error) {
            console.warn('Error checking cached profile:', error)
          }
        }
      }
      
      // If we didn't find cached data, fall back to the original approach
      // Get user ID for cache keys
      const user = await pocketbase.collection('users').getFirstListItem(`userName = "${userName}"`)
      const userId = user.id
      
      // Check cache first (read-only, safe operation)
      const [profile, gridItems, backlogItems] = await Promise.all([
        simpleCache.get('profile', userId),
        simpleCache.get('grid_items', userId),
        simpleCache.get('backlog_items', userId)
      ])
      
      // Use cached data if available
      if (profile && gridItems && backlogItems) {
        console.log('📖 Using cached other profile data')
        setProfile(profile as Profile)
        setGridItems(gridItems as ExpandedItem[])
        setBacklogItems(backlogItems as ExpandedItem[])
        setLoading(false)
        return
      }
      
      // Fetch fresh data
      const [freshProfile, freshGridItems, freshBacklogItems] = await Promise.all([
        getUserByUserName(userName),
        getProfileItems(userName),
        getBacklogItems(userName),
      ])
      
      setProfile(freshProfile)
      setGridItems(freshGridItems)
      setBacklogItems(freshBacklogItems as ExpandedItem[])
      
      // Cache the fresh data
      Promise.all([
        simpleCache.set('profile', freshProfile, userId),
        simpleCache.set('grid_items', freshGridItems, userId),
        simpleCache.set('backlog_items', freshBacklogItems, userId)
      ]).catch(error => {
        console.warn('Cache write failed:', error)
      })
      
      setLoading(false)
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        // Only run heavy database operations when component is active
        await refreshGrid(userName)
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName]) // Removed isActiveTab dependency

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const backlogSheetRef = useRef<BottomSheet>(null)

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
                  editingRights={false}
                  onPressItem={(item) => {
                    setDetailsItem(item!)
                    detailsSheetRef.current?.snapToIndex(0)
                  }}
                  isOffscreen={false} // OtherProfile is always visible when mounted
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
