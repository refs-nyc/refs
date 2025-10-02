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

export const OtherProfile = ({ userName, prefetchedUserId }: { userName: string; prefetchedUserId?: string }) => {
  const [profile, setProfile] = useState<Profile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const { user, stopEditing, getUserByUserName } = useAppStore()

  const refreshGrid = async (userName: string, hintedUserId?: string) => {
    setLoading(true)
    try {
      const tryHydrateFromCache = async (userId: string) => {
        const [cachedProfile, cachedGridItems, cachedBacklogItems] = await Promise.all([
          simpleCache.get('profile', userId),
          simpleCache.get('grid_items', userId),
          simpleCache.get('backlog_items', userId),
        ])

        if (cachedProfile && cachedGridItems && cachedBacklogItems) {
          setProfile(cachedProfile as Profile)
          setGridItems(cachedGridItems as ExpandedItem[])
          setBacklogItems(cachedBacklogItems as ExpandedItem[])
          setLoading(false)
          return true
        }
        return false
      }

      if (hintedUserId) {
        const hydrated = await tryHydrateFromCache(hintedUserId)
        if (hydrated) {
          return
        }
      }

      // First, try to get cached profile data to extract userId (fallback for routes without hints)
      let derivedUserId: string | undefined = hintedUserId

      if (!derivedUserId) {
        try {
          const lookup = await AsyncStorage.getItem(`simple_cache_profile_lookup_${userName}`)
          if (lookup) {
            const parsed = JSON.parse(lookup)
            if (parsed?.userId) {
              derivedUserId = parsed.userId
            }
          }
        } catch (error) {
          console.warn('Profile lookup read failed:', error)
        }
      }

      if (!derivedUserId) {
        try {
          const allKeys = await AsyncStorage.getAllKeys()
          const profileKeys = allKeys.filter(key => key.includes('simple_cache_profile_'))

          if (profileKeys.length > 0) {
            for (const key of profileKeys) {
              try {
                const cachedEntry = await AsyncStorage.getItem(key)
                if (cachedEntry) {
                  const entry = JSON.parse(cachedEntry)
                  const cachedProfileData = entry.data
                  if (cachedProfileData?.userName === userName && cachedProfileData?._cachedUserId) {
                    derivedUserId = cachedProfileData._cachedUserId
                    break
                  }
                }
              } catch (error) {
                console.warn('Error checking cached profile:', error)
              }
            }
          }
        } catch (error) {
          console.warn('Profile key scan failed:', error)
        }
      }

      if (derivedUserId) {
        const hydrated = await tryHydrateFromCache(derivedUserId)
        if (hydrated) {
          return
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
      const profileWithUserId = { ...freshProfile, _cachedUserId: userId }
      Promise.all([
        simpleCache.set('profile', profileWithUserId, userId),
        simpleCache.set('grid_items', freshGridItems, userId),
        simpleCache.set('backlog_items', freshBacklogItems, userId)
      ]).catch(error => {
        console.warn('Cache write failed:', error)
      })
      // Persist hint for future lookups when arriving without params
      try {
        profileWithUserId && (await AsyncStorage.setItem(`simple_cache_profile_lookup_${userName}`, JSON.stringify({ userId })))
      } catch (error) {
        console.warn('Profile lookup write failed:', error)
      }

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
        await refreshGrid(userName, prefetchedUserId)
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName, prefetchedUserId]) // Removed isActiveTab dependency

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
