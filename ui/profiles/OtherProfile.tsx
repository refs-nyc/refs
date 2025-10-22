import { useAppStore } from '@/features/stores'
import { getBacklogItems, getProfileItems } from '@/features/stores/items'
import type { Profile } from '@/features/types'
import { ExpandedItem } from '@/features/types'
import { c, s } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, View, Text, Pressable, Share, Animated } from 'react-native'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { Heading } from '../typo/Heading'
import { OtherBacklogSheet } from './sheets/OtherBacklogSheet'
import { OtherButtonsSheet } from './sheets/OtherButtonsSheet'
import { simpleCache } from '@/features/cache/simpleCache'
import { pocketbase } from '@/features/pocketbase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Image } from 'expo-image'
import Svg, { Circle } from 'react-native-svg'
import { enqueueIdleTask } from '@/features/utils/idleQueue'
import { fetchProfileData } from '@/features/queries/profile'
import Ionicons from '@expo/vector-icons/Ionicons'

export const OtherProfile = ({ userName, prefetchedUserId }: { userName: string; prefetchedUserId?: string }) => {
  const [profile, setProfile] = useState<Profile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const forceNetworkRefreshQueuedRef = useRef(false)
  const shareButtonScale = useRef(new Animated.Value(1)).current

  const {
    user,
    stopEditing,
    detailsSheetRef,
    setDetailsSheetData,
    openAvatarZoom,
  } = useAppStore()

  const queueForceNetworkRefresh = useCallback(
    (userId: string) => {
      if (forceNetworkRefreshQueuedRef.current) return
      forceNetworkRefreshQueuedRef.current = true

      enqueueIdleTask(async () => {
        try {
          const fresh = await fetchProfileData({ userId, includeBacklog: true })
          setProfile(fresh.profile)
          setGridItems(fresh.gridItems)
          setBacklogItems(fresh.backlogItems)
          const profileWithUserId = { ...fresh.profile, _cachedUserId: fresh.profile.id }
          Promise.all([
            simpleCache.set('profile', profileWithUserId, fresh.profile.id),
            simpleCache.set('grid_items', fresh.gridItems, fresh.profile.id),
            simpleCache.set('backlog_items', fresh.backlogItems, fresh.profile.id),
          ]).catch((error) => {
            console.warn('OtherProfile cache refresh failed', error)
          })
        } catch (error) {
          if (__DEV__) {
            console.warn('[boot-trace] otherProfile.forceNetworkRefresh failed', error)
          }
          forceNetworkRefreshQueuedRef.current = false
        } finally {
          forceNetworkRefreshQueuedRef.current = false
        }
      }, `profile:forceNetworkRefresh:${userId}`)
    },
    [userName]
  )

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
          queueForceNetworkRefresh(userId)
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
      const profileRecord = await pocketbase
        .collection<Profile>('users')
        .getFirstListItem(`userName = "${userName}"`)
      const userId = profileRecord.id
      
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
      const [freshGridItems, freshBacklogItems] = await Promise.all([
        getProfileItems({ userName, userId }),
        getBacklogItems({ userName, userId }),
      ])
      
      setProfile(profileRecord)
      setGridItems(freshGridItems)
      setBacklogItems(freshBacklogItems as ExpandedItem[])

      // Cache the fresh data
      const profileWithUserId = { ...profileRecord, _cachedUserId: userId }
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
      forceNetworkRefreshQueuedRef.current = false
    } catch (error) {
      console.error(error)
      setLoading(false)
      forceNetworkRefreshQueuedRef.current = false
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
  const backlogSheetRef = useRef<BottomSheet>(null)

  const displayName = (() => {
    if (!profile) return userName
    const first = (profile.firstName || '').trim()
    const last = (profile.lastName || '').trim()
    const combined = `${first} ${last}`.trim()
    if (combined) return combined
    const fallback = (profile.name || '').trim()
    return fallback || profile.userName || userName
  })()

  const locationLabel = (profile?.location || '').trim()
  const remoteAvatar = profile?.image || (profile as any)?.avatar_url || ''
  const hasAvatar = Boolean(remoteAvatar)

  const handleAvatarPress = useCallback(() => {
    if (!hasAvatar || !remoteAvatar) return
    openAvatarZoom(remoteAvatar)
  }, [hasAvatar, remoteAvatar, openAvatarZoom])

  const handleShareProfile = useCallback(async () => {
    if (!profile) return
    try {
      const profileUrl = `refsnyc://profile/${profile.userName}`
      const fallbackInstallUrl = 'https://testflight.apple.com/join/ENqdZ73R'
      const shareMessage = `Check out ${displayName} on Refs:\n${profileUrl}\nNeed the app? ${fallbackInstallUrl}`

      await Share.share({ message: shareMessage })
    } catch (error) {
      console.error('Error sharing profile:', error)
    }
  }, [profile, displayName])

  const handleSharePressIn = useCallback(() => {
    Animated.spring(shareButtonScale, { toValue: 0.94, useNativeDriver: true }).start()
  }, [shareButtonScale])

  const handleSharePressOut = useCallback(() => {
    Animated.spring(shareButtonScale, { toValue: 1, useNativeDriver: true }).start()
  }, [shareButtonScale])

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          justifyContent: 'center',
          alignItems: 'stretch',
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
              paddingHorizontal: 16,
              marginTop: 10,
            }}
          >
            <View style={{ width: '100%', paddingHorizontal: 0, marginBottom: s.$1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                {/* Avatar on left */}
                <Pressable onPress={handleAvatarPress} hitSlop={12} disabled={!hasAvatar}>
                  {hasAvatar ? (
                    <View
                      style={{
                        width: 61.2 * 1.1,
                        height: 61.2 * 1.1,
                        borderRadius: (61.2 * 1.1) / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: c.surface,
                        borderWidth: 2.5,
                        borderColor: '#B0B0B0',
                      }}
                    >
                      <View
                        style={{
                          width: 61.2,
                          height: 61.2,
                          borderRadius: 61.2 / 2,
                          borderWidth: 2.5,
                          borderColor: c.surface,
                          overflow: 'hidden',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: c.surface2,
                          borderStyle: 'solid',
                        }}
                      >
                        <Image source={remoteAvatar} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                      </View>
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 61.2,
                        height: 61.2,
                        borderRadius: 61.2 / 2,
                        borderWidth: 2.5,
                        borderColor: '#B0B0B0',
                        borderStyle: 'dashed',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: c.surface2,
                      }}
                    >
                      <Svg width={32} height={20} viewBox="0 0 64 40">
                        <Circle cx="24" cy="20" r="16" fill="none" stroke={c.muted} strokeWidth="2" />
                        <Circle cx="40" cy="20" r="16" fill="none" stroke={c.muted} strokeWidth="2" />
                      </Svg>
                    </View>
                  )}
                </Pressable>

                {/* Name and location in center */}
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

                {/* Share button on right */}
                <Animated.View style={{ transform: [{ scale: shareButtonScale }] }}>
                  <Pressable
                    onPress={handleShareProfile}
                    onPressIn={handleSharePressIn}
                    onPressOut={handleSharePressOut}
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 0,
                      elevation: 2,
                      backgroundColor: c.surface,
                      borderRadius: 50,
                      borderWidth: 3,
                      borderColor: c.grey1,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityLabel="Share profile"
                  >
                    <Text
                      style={{
                        color: c.muted,
                        fontSize: 13,
                        fontWeight: '500',
                        fontFamily: 'Inter',
                      }}
                    >
                      share
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>

            <View style={{ gap: s.$2 }}>
              {loading ? (
                <PlaceholderGrid columns={3} rows={4} />
              ) : (
                <Grid
                  columns={3}
                  items={gridItems}
                  rows={4}
                  editingRights={false}
                  showPrompts={false}
                  rowJustify="center"
                  onPressItem={(item) => {
                    setDetailsSheetData({
                      itemId: item!.id,
                      profileUsername: profile.userName,
                      openedFromFeed: false,
                    })
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
        </>
      )}

    </>
  )
}
