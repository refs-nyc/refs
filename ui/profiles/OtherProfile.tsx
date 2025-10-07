import { useAppStore } from '@/features/stores'
import { getBacklogItems, getProfileItems } from '@/features/stores/items'
import type { Profile } from '@/features/types'
import { ExpandedItem } from '@/features/types'
import { c, s } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View, Text, Pressable, Animated, Dimensions, StyleSheet, GestureResponderEvent } from 'react-native'
import { withTiming } from 'react-native-reanimated'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { OtherBacklogSheet } from './sheets/OtherBacklogSheet'
import { OtherButtonsSheet } from './sheets/OtherButtonsSheet'
import { simpleCache } from '@/features/cache/simpleCache'
import { pocketbase } from '@/features/pocketbase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Image } from 'expo-image'

export const OtherProfile = ({ userName, prefetchedUserId }: { userName: string; prefetchedUserId?: string }) => {
  const [profile, setProfile] = useState<Profile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const { user, stopEditing, getUserByUserName, otherProfileBackdropAnimatedIndex } = useAppStore()

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
  const [avatarOverlayVisible, setAvatarOverlayVisible] = useState(false)
  const overlayOpacity = useRef(new Animated.Value(0)).current
  const overlayScale = useRef(new Animated.Value(0.85)).current

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
  const expandedAvatarSize = Math.min(Dimensions.get('window').width * 0.75, 300)

  const openAvatar = () => {
    if (!hasAvatar) return
    setAvatarOverlayVisible(true)
    if (otherProfileBackdropAnimatedIndex) {
      otherProfileBackdropAnimatedIndex.value = withTiming(0, { duration: 180 })
    }
    overlayOpacity.setValue(0)
    overlayScale.setValue(0.85)
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(overlayScale, {
        toValue: 1,
        damping: 14,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const closeAvatar = () => {
    if (otherProfileBackdropAnimatedIndex) {
      otherProfileBackdropAnimatedIndex.value = withTiming(-1, { duration: 180 })
    }
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(overlayScale, {
        toValue: 0.85,
        damping: 14,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAvatarOverlayVisible(false)
    })
  }

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
              paddingHorizontal: s.$1 + 6,
            }}
          >
            <View style={{ width: '100%', paddingHorizontal: 0, marginBottom: s.$1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: c.newDark,
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
                <Pressable onPress={openAvatar} hitSlop={12} disabled={!hasAvatar}>
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
                      borderColor: hasAvatar ? c.surface : '#B0B0B0',
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: c.surface2,
                      borderStyle: hasAvatar ? 'solid' : 'dashed',
                      }}
                    >
                      {hasAvatar ? (
                        <Image source={remoteAvatar} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                      ) : (
                        <Text style={{ color: c.prompt, fontSize: 24, fontWeight: '600' }}>+
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
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
                  rowJustify="center"
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

      {avatarOverlayVisible && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAvatar}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayOpacity }]}
          />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="box-none">
            <Pressable
              onPress={(event: GestureResponderEvent) => {
                event.stopPropagation()
              }}
              hitSlop={20}
            >
              <Animated.View
                style={{
                  transform: [{ scale: overlayScale }],
                  borderRadius: expandedAvatarSize / 2,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 10 },
                  opacity: overlayOpacity,
                }}
              >
                <Image
                  source={remoteAvatar}
                  style={{ width: expandedAvatarSize, height: expandedAvatarSize, backgroundColor: c.surface2 }}
                  contentFit="cover"
                />
              </Animated.View>
            </Pressable>
          </View>
        </Pressable>
      )}
    </>
  )
}
