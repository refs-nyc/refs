import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { View, Text, Pressable, FlatList, InteractionManager, Dimensions, ScrollView } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { s, c, t } from '@/features/style'
import { router, usePathname } from 'expo-router'
import { Grid } from '@/ui/grid/Grid'
// import { Button } from '@/ui/buttons/Button'
// import BottomSheet from '@gorhom/bottom-sheet'
// import { CommunityFormSheet } from '@/ui/communities/CommunityFormSheet'
import { Image } from 'expo-image'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import type { DirectoryUser } from '@/features/stores/users'
import type { Profile } from '@/features/types'
import { simpleCache } from '@/features/cache/simpleCache'
import Svg, { Circle, Path } from 'react-native-svg'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DIRECTORY_TICKER_COLOR = c.accent
// Listen for interests added from the CommunityInterestsScreen and update chips instantly
if (typeof globalThis !== 'undefined' && (globalThis as any).addEventListener) {
  try {
    (globalThis as any).removeEventListener?.('refs:new-interest', () => {})
    ;(globalThis as any).addEventListener('refs:new-interest', (e: any) => {
      try {
        const detail = e?.detail
        if (!detail?.id) return
        // This handler will be overridden in the component scope via pocketbase subscription too
        // Kept here as a safety no-op; component adds PB-based handler below
      } catch {}
    })
  } catch {}
}

type FeedUser = {
  id: string
  userName: string
  name: string
  neighborhood: string
  avatar_url: string
  topRefs: string[]
  _latest?: number
}

// Memoized row component to prevent unnecessary re-renders
const BookmarkIcon = ({ filled }: { filled: boolean }) => {
  // Slightly wider with a thinner stroke
  const width = 36
  const height = 48
  const stroke = c.newDark
  return (
    <Svg width={width} height={height} viewBox="0 0 26 28" fill="none">
      <Path
        d="M6 3h14a1 1 0 011 1v20l-8-3.5L5 24V4a1 1 0 011-1z"
        stroke={stroke}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? stroke : 'none'}
      />
    </Svg>
  )
}

const OnboardingPill = ({
  userName,
  fullName,
  avatarUri,
}: {
  userName: string
  fullName: string
  avatarUri?: string
}) => {
  const pillScale = useSharedValue(1)
  const setProfileNavIntent = useAppStore((state) => state.setProfileNavIntent)
  const homePagerIndex = useAppStore((state) => state.homePagerIndex)
  const pathname = usePathname()
  const hasAvatar = Boolean(avatarUri)

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
  }))

  const handlePress = useCallback(() => {
    if (!userName) return

    pillScale.value = withSpring(
      0.95,
      { damping: 10, stiffness: 400 },
      (finished) => {
        if (finished) {
          pillScale.value = withSpring(1, { damping: 8, stiffness: 300 })
        }
      }
    )

    const targetIndex = 0
    const alreadyOnGrid = homePagerIndex === targetIndex

    setProfileNavIntent({ targetPagerIndex: targetIndex, source: 'directory', animate: !alreadyOnGrid })

    const expectedPath = `/user/${userName}`
    // Always push to create navigation history for proper back gesture
    // Add timestamp to force new stack entry
    if (!pathname || pathname !== expectedPath) {
      router.push({
        pathname: '/user/[userName]',
        params: { userName, _t: Date.now().toString() }
      })
    }
  }, [homePagerIndex, pathname, setProfileNavIntent, userName])

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          {
            backgroundColor: c.surface,
            borderRadius: s.$1,
            paddingVertical: s.$075,
            paddingHorizontal: s.$075,
            marginBottom: s.$075,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 2,
            borderColor: c.prompt,
            borderStyle: 'dashed',
          },
          pillAnimatedStyle,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              borderWidth: 1.5,
              borderColor: `${c.prompt}1A`, // 10% opacity
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
              backgroundColor: c.surface,
            }}
          >
            {hasAvatar ? (
              <Image
                source={avatarUri}
                style={{ width: '100%', height: '100%', borderRadius: 30 }}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <Text style={{ color: c.prompt, fontSize: 28, fontWeight: '600' }}>+</Text>
            )}
          </View>
          <View style={{ marginLeft: 3, gap: 2 }}>
            <Text style={{ color: c.prompt, fontWeight: '700', fontSize: (s.$09 as number) + 1 }} numberOfLines={1} ellipsizeMode="tail">
              {fullName}
            </Text>
            <Text style={{ color: c.accent, fontFamily: 'InterMedium', fontSize: 12, fontWeight: '500' }}>
              Add a profile photo and 3 refs to appear
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}

const DirectoryRow = React.memo(({
  u,
  onPress,
  onToggleSave,
  isSaved,
  userInterestMap,
  refTitleMap,
  currentUserId,
  innerLeftPadding,
}: {
  u: FeedUser
  onPress: () => void
  onToggleSave: () => void
  isSaved: boolean
  userInterestMap: Map<string, Set<string>>
  refTitleMap: Map<string, string>
  currentUserId?: string
  innerLeftPadding?: number
}) => {
  const bookmarkScale = useSharedValue(1)
  
  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }))

  const handleBookmarkPress = useCallback(() => {
    bookmarkScale.value = withSpring(0.9, { damping: 10, stiffness: 400 }, () => {
      bookmarkScale.value = withSpring(1, { damping: 8, stiffness: 300 })
    })
    onToggleSave()
  }, [onToggleSave])

  // Compute overlap with current user (by ref ids in this community)
  const overlapLabel = useMemo(() => {
    if (!currentUserId) return null
    const mine = userInterestMap.get(currentUserId)
    const theirs = userInterestMap.get(u.id)
    if (!mine || !theirs || mine.size === 0 || theirs.size === 0) return null
    let first: string | null = null
    let count = 0
    for (const id of theirs) {
      if (mine.has(id)) {
        if (first == null) first = refTitleMap.get(id) || null
        count += 1
      }
    }
    if (count === 0) return null
    const suffix = count > 1 ? ` +${count - 1}` : ''
    return `${first || `${count} shared`}${suffix}`
  }, [currentUserId, userInterestMap, refTitleMap, u.id])
  
  return (
    <Pressable
      key={u.id}
      style={{
        backgroundColor: c.surface2,
        borderRadius: s.$1,
        paddingVertical: s.$075,
        paddingHorizontal: s.$075,
        marginBottom: s.$075,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        {u.avatar_url ? (
          <Image
            source={u.avatar_url}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: c.surface2,
            }}
            contentFit={'cover'}
            cachePolicy="memory-disk"
            transition={0}
            priority="high"
          />
        ) : (
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: 'transparent',
            }}
          />
        )}
        <View style={{ flex: 1, marginLeft: 5, gap: 4 }}>
          <Text style={{ color: c.black, fontWeight: '700', fontSize: (s.$09 as number) + 1 }} numberOfLines={1} ellipsizeMode="tail">
            {u.name}
          </Text>
          <Text style={{ color: c.newDark }} numberOfLines={1} ellipsizeMode="tail">
            {u.neighborhood || 'Elsewhere'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.$05 }}>
        {overlapLabel && (
          <View
            style={{
              borderWidth: 1.5,
              borderColor: 'rgba(176,176,176,0.5)',
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: 'transparent',
            }}
          >
            <Text style={{ color: c.newDark, opacity: 0.8, fontSize: (s.$09 as number) - 2, fontWeight: '600' }} numberOfLines={1}>
              {overlapLabel}
            </Text>
          </View>
        )}
        <Pressable
          onPress={(event) => {
            event.stopPropagation()
            handleBookmarkPress()
          }}
          hitSlop={10}
          style={{ padding: 2 }}
        >
          <Animated.View style={bookmarkAnimatedStyle}>
            <BookmarkIcon filled={isSaved} />
          </Animated.View>
        </Pressable>
      </View>
    </Pressable>
  )
}, (prevProps, nextProps) => {
  if (prevProps.u.id !== nextProps.u.id) return false
  if (prevProps.isSaved !== nextProps.isSaved) return false
  return true
})

DirectoryRow.displayName = 'DirectoryRow'

// Ensure we only schedule profile preloading once per app session
let hasScheduledProfilePreload = false

const win = Dimensions.get('window')
const BASE_DIRECTORY_LIST_HEIGHT = Math.max(360, Math.min(560, win.height - 220))
const DIRECTORY_LIST_HEIGHT = Math.max(200, BASE_DIRECTORY_LIST_HEIGHT - 50)

const normalizeDirectoryUsers = (list: FeedUser[], currentUserName?: string) => {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const normalized: FeedUser[] = []

  for (const user of list) {
    if (!user) continue
    if (user.userName && user.userName === currentUserName) continue
    if (!Array.isArray(user.topRefs) || user.topRefs.length === 0) continue

    const rawId = user.id ?? user.userName
    if (rawId == null) continue
    const stringId = String(rawId)
    if (!stringId || seen.has(stringId)) continue

    seen.add(stringId)
    normalized.push({ ...user, id: stringId })
  }

  return normalized
}

const haveSameIds = (a: FeedUser[], b: FeedUser[]) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false
  }
  return true
}

export function CommunitiesFeedScreen({
  showHeader = true,
  aboveListComponent,
  hideInterestChips = false,
  embedded = false,
  embeddedPadding = 0,
}: {
  showHeader?: boolean
  aboveListComponent?: React.ReactNode
  hideInterestChips?: boolean
  embedded?: boolean
  embeddedPadding?: number
}) {
  // Directories screen: paginated list of all users
  const {
    setProfileNavIntent,
    setDirectoriesFilterTab,
    user,
    directoryUsers,
    setDirectoryUsers,
    saves,
    addSave,
    removeSave,
    gridItemCount,
  } = useAppStore()
  const directoryUsersNormalized = useMemo(
    () => normalizeDirectoryUsers((directoryUsers as FeedUser[]) || [], user?.userName),
    [directoryUsers, user?.userName]
  )
  const directoryUsersNormalizedRef = useRef<FeedUser[]>(directoryUsersNormalized)
  const pendingStoreUpdateRef = useRef<FeedUser[] | null>(null)
  const [users, setUsers] = useState<FeedUser[]>(directoryUsersNormalized)
  // const [communityItems, setCommunityItems] = useState<any[]>([])
  // const communityFormRef = useRef<BottomSheet>(null)
  const [outerScrollEnabled, setOuterScrollEnabled] = useState(true)
  const [topInterests, setTopInterests] = useState<{ refId: string; title: string; count: number; created?: string }[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [userInterestMap, setUserInterestMap] = useState<Map<string, Set<string>>>(new Map())
  const [refTitleMap, setRefTitleMap] = useState<Map<string, string>>(new Map())
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [hasInitialData, setHasInitialData] = useState(false)
  const perPage = 50 // Increased from 30 to show more entries
  const pbRef = useRef<typeof pocketbase | null>(null)
  const getPB = () => {
    if (!pbRef.current) pbRef.current = pocketbase
    return pbRef.current
  }

  const commitUsers = useCallback(
    (value: FeedUser[] | ((prev: FeedUser[]) => FeedUser[])) => {
      setUsers((prev) => {
        const next =
          typeof value === 'function'
            ? (value as (prev: FeedUser[]) => FeedUser[])(prev)
            : value
        const normalized = normalizeDirectoryUsers(next as FeedUser[], user?.userName)
        pendingStoreUpdateRef.current = normalized
        return normalized
      })
    },
    [user?.userName]
  )

  useEffect(() => {
    // Keep local state in sync if another part of the app updates the store
    if (haveSameIds(directoryUsersNormalized, directoryUsersNormalizedRef.current)) {
      directoryUsersNormalizedRef.current = directoryUsersNormalized
      return
    }
    directoryUsersNormalizedRef.current = directoryUsersNormalized
    setUsers(directoryUsersNormalized)
  }, [directoryUsersNormalized])

  const mapUsersWithItems = useCallback((userRecords: any[], itemsByCreator: Map<string, any[]>) => {
    console.log(`📊 mapUsersWithItems called with ${userRecords.length} users`)
    const result: (FeedUser & { _latest?: number })[] = []
    for (const r of userRecords) {
      const creatorId = r.id
      const creatorItems = itemsByCreator.get(creatorId) || []
      
      // Filter: must have an avatar AND at least 3 grid items
      const image = (r.image || '').trim()
      const avatarUrl = (r.avatar_url || '').trim()
      const hasAvatar = Boolean(image || avatarUrl)
      const hasEnoughItems = creatorItems.length >= 3
      
      console.log(`🔍 Checking ${r.userName}: image="${image}", avatar_url="${avatarUrl}", hasAvatar=${hasAvatar}, itemCount=${creatorItems.length}`)
      
      if (!hasAvatar || !hasEnoughItems) {
        console.log(`🚫 Filtering out ${r.userName}: hasAvatar=${hasAvatar}, itemCount=${creatorItems.length}`)
        continue
      }
      
      console.log(`✅ Including ${r.userName} in directory`)
      
      const images = creatorItems
        .slice(0, 3)
        .map((it) => it?.image || it?.expand?.ref?.image)
        .filter(Boolean)
      const latest = creatorItems[0]?.created ? new Date(creatorItems[0].created).getTime() : 0
      const first = (r.firstName || '').trim()
      const last = (r.lastName || '').trim()
      const combinedName = `${first} ${last}`.trim()
      const displayName = combinedName || r.firstName || r.name || r.userName
      const neighborhood = (r.location || '').trim() || 'Elsewhere'

      result.push({
        id: r.id,
        userName: r.userName,
        name: displayName,
        neighborhood,
        // Prefer `image` as source of truth, fallback to `avatar_url` if present
        avatar_url: r.image || r.avatar_url || '',
        topRefs: images,
        _latest: latest,
      } as any)
    }
    // Remove expensive sort operation - let the database handle sorting
    // result.sort((a, b) => (b._latest || 0) - (a._latest || 0))
    return result as FeedUser[]
  }, [])

  // Memoize the processed users to prevent recalculation during scroll
  const processedUsers = useMemo(() => {
    // Simply return the users array - no processing needed
    // This should be a pure pass-through for cached data
    return users
  }, [users]) // Depend on the actual array since we're not processing it

  const saveMapRef = useRef(new Map<string, string>())
  const [optimisticSaved, setOptimisticSaved] = useState<Map<string, boolean>>(new Map())

  useEffect(() => {
    const map = new Map<string, string>()
    for (const save of saves) {
      const savedUserId = save.expand?.user?.id || (save as any).user
      if (savedUserId) map.set(savedUserId, save.id)
    }
    saveMapRef.current = map
  }, [saves])

  const isUserSaved = useCallback(
    (userId: string) => {
      if (optimisticSaved.has(userId)) return optimisticSaved.get(userId) === true
      return saveMapRef.current.has(userId)
    },
    [optimisticSaved]
  )

  const toggleSaveForUser = useCallback(
    (user: FeedUser) => {
      const userId = user.id
      const existing = saveMapRef.current.get(userId)
      if (existing) {
        setOptimisticSaved((prev) => {
          const map = new Map(prev)
          map.set(userId, false)
          return map
        })
        void removeSave(existing).finally(() => {
          setOptimisticSaved((prev) => {
            const map = new Map(prev)
            map.delete(userId)
            return map
          })
        })
      } else {
        setOptimisticSaved((prev) => {
          const map = new Map(prev)
          map.set(userId, true)
          return map
        })
        const [firstNameHint, ...rest] = (user.name || '').split(' ').filter(Boolean)
        const profileHint: Partial<Profile> = {
          id: userId,
          firstName: firstNameHint || user.name || user.userName,
          lastName: rest.join(' '),
          name: user.name,
          userName: user.userName,
          location: user.neighborhood,
          image: user.avatar_url,
          avatar_url: user.avatar_url,
        }
        void addSave(userId, profileHint)
          .catch((error) => {
            console.warn('Failed to save user', error)
          })
          .finally(() => {
            setOptimisticSaved((prev) => {
              const map = new Map(prev)
              map.delete(userId)
              return map
            })
          })
      }
    },
    [addSave, removeSave]
  )

  // Directory list filtered by selected interest chips (AND match)
  const displayedUsers = useMemo(() => {
    if (selectedInterests.length === 0) return processedUsers
    return processedUsers.filter((u) => {
      const set = userInterestMap.get(u.id)
      if (!set) return false
      for (let i = 0; i < selectedInterests.length; i++) {
        if (!set.has(selectedInterests[i])) return false
      }
      return true
    })
  }, [processedUsers, selectedInterests, userInterestMap])

  const fetchPage = useCallback(async (targetPage: number, options?: { skipCache?: boolean }) => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    
    try {
      // Check cache for first page only
      const skipCache = options?.skipCache ?? false
      if (targetPage === 1 && !skipCache) {
        const cachedUsers = await simpleCache.get('directory_users')
        if (cachedUsers) {
          console.log('📖 Checking cached directory users...')
          // Filter cached users to ensure they have avatar AND 3+ items
          const filteredCached = (cachedUsers as FeedUser[]).filter(u => {
            const hasAvatar = Boolean(u.avatar_url && u.avatar_url.trim())
            const hasEnoughItems = (u.topRefs?.length || 0) >= 3
            if (!hasAvatar || !hasEnoughItems) {
              console.log(`🚫 Cached user ${u.userName} doesn't meet criteria: hasAvatar=${hasAvatar} (avatar_url="${u.avatar_url}"), itemCount=${u.topRefs?.length || 0}`)
            }
            return hasAvatar && hasEnoughItems
          })
          
          // If we filtered out ANY users, invalidate cache and fetch fresh
          if (filteredCached.length < (cachedUsers as FeedUser[]).length) {
            console.log(`🗑️ Cache is stale (${(cachedUsers as FeedUser[]).length} users → ${filteredCached.length} after filtering). Clearing and fetching fresh data...`)
            await AsyncStorage.removeItem('simple_cache_directory_users')
            // Continue to fetch fresh data below (don't return early)
          } else {
            console.log(`✅ Using ${filteredCached.length} users from cache (all valid)`)
            commitUsers(filteredCached)
            setHasMore(true) // Assume there are more pages
            setPage(1)
            setIsLoading(false)
            return
          }
        }
      }
      
      const pb = getPB()
      const res = await pb.collection('users').getList(targetPage, perPage, {
        fields: 'id,userName,firstName,lastName,name,location,image,avatar_url',
        sort: '-created',
      })

      // Batch fetch grid items for all users on this page
      const userIds = res.items.map((u: any) => u.id)
      if (userIds.length === 0) {
        setHasMore(false)
        setIsLoading(false)
        return
      }

      const orFilter = userIds.map((id: string) => `creator = "${id}"`).join(' || ')
      const perPageItems = Math.max(3 * userIds.length, 60)
      const itemsRes = await pb.collection('items').getList(1, perPageItems, {
        filter: `(${orFilter}) && backlog = false && list = false && parent = null`,
        fields: 'id,image,creator,created,expand.ref(image)',
        expand: 'ref',
        sort: '-created',
      })

      // Process data immediately instead of deferring with InteractionManager
      // Group items by creator
      const byCreator = new Map<string, any[]>()
      for (const it of itemsRes.items as any[]) {
        const creatorId = it.creator
        if (!creatorId) continue
        const arr = byCreator.get(creatorId) || []
        if (arr.length < 3) {
          arr.push(it)
          byCreator.set(creatorId, arr)
        }
      }

      const mapped = mapUsersWithItems(res.items, byCreator)
      // Filter out the current user from the directory list
      const filteredMapped = mapped.filter(u => u.userName !== user?.userName)
      
      // Pre-load profile data for all users in the directory (deferred)
      const preloadProfiles = async () => {
        try {
          // Build a set of cached profile IDs by key prefix (avoid JSON parsing)
          const cachedIds = new Set<string>()
          try {
            const allKeys = await AsyncStorage.getAllKeys()
            for (const key of allKeys) {
              if (key.startsWith('simple_cache_profile_')) {
                const id = key.slice('simple_cache_profile_'.length)
                if (id) cachedIds.add(id)
              }
            }
          } catch {}

          // Only pre-load profiles that aren't already cached (by id)
          const usersToPreload = filteredMapped.filter(u => !cachedIds.has(u.id))
          
          if (usersToPreload.length === 0) {
            console.log('✅ All profiles already cached, skipping pre-loading')
            return
          }
          
          console.log(`🚀 Pre-loading ${usersToPreload.length} uncached profiles`)
          
          // Start with just the first 3 uncached users to make them instantly available
          const immediateUsers = usersToPreload.slice(0, 3)
          
          // Pre-load these users immediately and synchronously
          for (const userData of immediateUsers) {
            if (userData.userName) {
              try {
                const [profile, gridItems, backlogItems] = await Promise.all([
                  pocketbase.collection('users').getFirstListItem(`userName = "${userData.userName}"`),
                  pocketbase.collection('items').getList(1, 50, {
                    filter: pocketbase.filter(
                      'creator.userName = {:userName} && backlog = false && parent = null',
                      { userName: userData.userName }
                    ),
                    expand: 'ref, creator',
                    sort: '-created',
                  }),
                  pocketbase.collection('items').getList(1, 50, {
                    filter: pocketbase.filter(
                      'creator.userName = {:userName} && backlog = true && parent = null',
                      { userName: userData.userName }
                    ),
                    expand: 'ref',
                    sort: '-created',
                  })
                ])
                
                // Cache the pre-loaded data immediately
                const userId = profile.id
                // Embed userId in profile data for easy access in OtherProfile
                const profileWithUserId = { ...profile, _cachedUserId: userId }
                
                await Promise.all([
                  simpleCache.set('profile', profileWithUserId, userId),
                  simpleCache.set('grid_items', gridItems.items, userId),
                  simpleCache.set('backlog_items', backlogItems.items, userId)
                ])
                
                console.log(`🚀 Pre-loaded profile for ${userData.userName}`)
              } catch (error) {
                console.warn(`Profile pre-load failed for ${userData.userName}:`, error)
              }
            }
          }
          
          // Pre-load the rest of the uncached profiles in the background
          if (usersToPreload.length > 3) {
            const remainingUsers = usersToPreload.slice(3)
            
            // Defer background pre-loading to idle frames to avoid jank
            setTimeout(async () => {
              for (const userData of remainingUsers) {
                if (userData.userName) {
                  try {
                    const [profile, gridItems, backlogItems] = await Promise.allSettled([
                      pocketbase.collection('users').getFirstListItem(`userName = "${userData.userName}"`),
                      pocketbase.collection('items').getList(1, 50, {
                        filter: pocketbase.filter(
                          'creator.userName = {:userName} && backlog = false && parent = null',
                          { userName: userData.userName }
                        ),
                        expand: 'ref, creator',
                        sort: '-created',
                      }),
                      pocketbase.collection('items').getList(1, 50, {
                        filter: pocketbase.filter(
                          'creator.userName = {:userName} && backlog = true && parent = null',
                          { userName: userData.userName }
                        ),
                        expand: 'ref',
                        sort: '-created',
                      })
                    ])
                    
                    if (profile.status === 'fulfilled' && gridItems.status === 'fulfilled' && backlogItems.status === 'fulfilled') {
                      const userId = profile.value.id
                      // Embed userId in profile data for easy access in OtherProfile
                      const profileWithUserId = { ...profile.value, _cachedUserId: userId }
                      
                      Promise.allSettled([
                        simpleCache.set('profile', profileWithUserId, userId),
                        simpleCache.set('grid_items', gridItems.value.items, userId),
                        simpleCache.set('backlog_items', backlogItems.value.items, userId)
                      ]).catch(error => {
                        console.warn('Profile pre-load cache failed:', error)
                      })
                    }
                  } catch (error) {
                    console.warn('Background profile pre-load failed:', error)
                  }
                }
              }
            }, 1000)
          }
        } catch (error) {
          console.warn('Profile pre-loading failed:', error)
        }
      }
      
      // Schedule pre-loading after interactions and only once per session
      if (!hasScheduledProfilePreload) {
        hasScheduledProfilePreload = true
        InteractionManager.runAfterInteractions(() => {
          // Small delay to ensure scroll/gesture handlers are idle
          setTimeout(() => { preloadProfiles() }, 0)
        })
      }
      
      const filteredWithRefs = normalizeDirectoryUsers(filteredMapped, user?.userName)
      const nextUsers = targetPage === 1 ? filteredWithRefs : [...users, ...filteredWithRefs]
      commitUsers(nextUsers)
      // Allow loading all pages; don't artificially cap at 50
      setHasMore(res.page < res.totalPages)
      setPage(res.page)
      
      // Set initial data flag when we successfully fetch data
      if (targetPage === 1) {
        setHasInitialData(true)
      }
      
      // Cache first page data for quick access (silent operation)
      simpleCache.set('directory_users', nextUsers).catch(error => {
        console.warn('Directory cache write failed:', error)
      })
    } catch (e) {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, user, mapUsersWithItems, users, commitUsers])

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      try {
        if (directoryUsersNormalized.length > 0) {
          setHasInitialData(true)
          return
        }

        const cachedUsers = await simpleCache.get('directory_users')
        if (cancelled) return

        if (cachedUsers && Array.isArray(cachedUsers) && cachedUsers.length > 0) {
          console.log('🔍 Hydrate: Filtering cached users...')
          // Filter cached users to ensure they have avatar AND 3+ items
          const filteredCached = (cachedUsers as FeedUser[]).filter(u => {
            const hasAvatar = Boolean(u.avatar_url && u.avatar_url.trim())
            const hasEnoughItems = (u.topRefs?.length || 0) >= 3
            return hasAvatar && hasEnoughItems
          })
          
          // If cache has stale data, clear it and fetch fresh
          if (filteredCached.length < cachedUsers.length) {
            console.log(`🗑️ Hydrate: Cache is stale (${cachedUsers.length} → ${filteredCached.length}). Fetching fresh...`)
            await AsyncStorage.removeItem('simple_cache_directory_users')
            await fetchPage(1, { skipCache: true })
          } else if (filteredCached.length > 0) {
            console.log(`✅ Hydrate: Using ${filteredCached.length} valid cached users`)
            commitUsers(filteredCached)
            setHasInitialData(true)
          } else {
            // No valid users in cache, fetch fresh
            await fetchPage(1, { skipCache: true })
          }
          return
        }

        await fetchPage(1, { skipCache: true })
      } catch (error) {
        console.warn('Directory initial load failed:', error)
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [commitUsers, directoryUsersNormalized, fetchPage])

  useEffect(() => {
    const candidate = pendingStoreUpdateRef.current
    pendingStoreUpdateRef.current = null
    if (!candidate) return
    if (!haveSameIds(candidate, directoryUsersNormalizedRef.current)) {
      setDirectoryUsers(candidate as DirectoryUser[])
      directoryUsersNormalizedRef.current = candidate
    }
  }, [setDirectoryUsers, users])

  // Load popular interests and user->interest map for filtering
  useEffect(() => {
    let mounted = true
    const COMMUNITY = 'edge-patagonia'
    ;(async () => {
      try {
        const items = await pocketbase.collection('items').getFullList({
          filter: pocketbase.filter('ref.meta ~ {:community} && backlog = false && parent = null', { community: COMMUNITY }),
          expand: 'ref,creator',
          sort: '-created',
        })
        if (!mounted) return
        const countByRef = new Map<string, { ref: any; count: number }>()
        const map = new Map<string, Set<string>>()
        for (const it of items as any[]) {
          const ref = it.expand?.ref
          const creator = it.expand?.creator || { id: it.creator }
          if (!ref || !creator?.id) continue
          const refId = ref.id
          const entry = countByRef.get(refId) || { ref, count: 0 }
          entry.count += 1
          countByRef.set(refId, entry)
          const set = map.get(creator.id) || new Set<string>()
          set.add(refId)
          map.set(creator.id, set)
        }
        const list = Array.from(countByRef.values()).map(({ ref, count }) => ({
          refId: ref.id,
          title: ref.title,
          count,
          created: ref.created,
        }))
        list.sort((a, b) => (b.count - a.count) || (b.created || '').localeCompare(a.created || ''))
        setTopInterests(list.slice(0, 30))
        setUserInterestMap(map)
        // Build quick title map for overlap labeling
        const titleMap = new Map<string, string>()
        for (const { ref } of countByRef.values()) {
          titleMap.set(ref.id, ref.title)
        }
        setRefTitleMap(titleMap)
      } catch (e) {
        console.warn('Failed to load interest ticker', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  const toggleChip = useCallback((refId: string) => {
    setSelectedInterests((prev) => (prev.includes(refId) ? prev.filter((id) => id !== refId) : [...prev, refId]))
  }, [])

  // Accept live additions of interests (chips) from CommunityInterestsScreen via event
  useEffect(() => {
    let mounted = true
    const COMMUNITY = 'edge-patagonia'
    const handler = async (e: any) => {
      try {
        const r = e?.record
        if (!r || typeof r?.meta !== 'string' || !r.meta.includes(COMMUNITY)) return
        // Add to topInterests if not present
        setTopInterests((prev) => {
          if (prev.some((ti) => ti.refId === r.id)) return prev
          const entry = { refId: r.id, title: r.title, count: 0, created: r.created }
          const next = [entry, ...prev]
          return next.slice(0, 30)
        })
      } catch {}
    }
    ;(async () => {
      try { await pocketbase.collection('refs').subscribe('*', handler) } catch {}
    })()
    return () => { try { pocketbase.collection('refs').unsubscribe('*') } catch {} }
  }, [])

  // Community interests grid removed from this screen

  // Memoize the onPress callback to prevent recreation on every render
  const handleUserPress = useCallback((userName: string, userId: string) => {
    if (!userName || !userId) return
    setDirectoriesFilterTab('people')
    setProfileNavIntent({ targetPagerIndex: 1, directoryFilter: 'people', source: 'directory' })
    router.push({
      pathname: '/user/[userName]',
      params: { userName, userId, fromDirectory: '1' },
    })
  }, [setDirectoriesFilterTab, setProfileNavIntent])

  // Community tile press handler not used in this screen

  const renderItem = useCallback(
    ({ item }: { item: FeedUser; index: number }) => {
      return (
        <DirectoryRow
          u={item}
          onPress={() => handleUserPress(item.userName, item.id)}
          onToggleSave={() => toggleSaveForUser(item)}
          isSaved={isUserSaved(item.id)}
          userInterestMap={userInterestMap}
          refTitleMap={refTitleMap}
          currentUserId={user?.id}
          innerLeftPadding={0}
        />
      )
    },
    [handleUserPress, toggleSaveForUser, isUserSaved, userInterestMap, refTitleMap, user?.id]
  )

  // Compute user's display name for onboarding pill
  const userDisplayName = useMemo(() => {
    if (!user) return ''
    const first = (user.firstName || '').trim()
    const last = (user.lastName || '').trim()
    const combined = `${first} ${last}`.trim()
    if (combined) return combined
    const fallback = (user.name || '').trim()
    return fallback || user.userName || ''
  }, [user])

  const userAvatarUri = useMemo(() => {
    if (!user) return ''
    const avatarCandidate = (user as any)?.avatar_url
    const candidates = [user.image, avatarCandidate]
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim()
      }
    }
    return ''
  }, [user])

  // Show onboarding pill until user has at least 3 refs
  const showOnboardingPill = gridItemCount < 3 && user?.userName

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {showHeader && (
        // Header: independent from list scroll; surface background
        <View style={{ paddingVertical: s.$1, alignItems: 'flex-start', justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6, marginBottom: 0 }}>
          <Text style={{ color: c.newDark, fontSize: (s.$09 as number) + 4, fontFamily: 'System', fontWeight: '700', textAlign: 'left', lineHeight: s.$1half }}>
            Directory
          </Text>
          <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', textAlign: 'left', lineHeight: s.$1half }}>
            Edge Patagonia
          </Text>
        </View>
      )}

      {/* Ticker filter chips (popular interests) as subheader under viewing */}
      {hideInterestChips
        ? null
        : (
          <View style={{ paddingLeft: s.$1 + 6, paddingTop: 0, paddingBottom: 24, marginTop: 0 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: s.$1 }}>
              {topInterests.map((ti) => {
                const selected = selectedInterests.includes(ti.refId)
                const tickerColor = DIRECTORY_TICKER_COLOR
                return (
                  <Pressable
                    key={ti.refId}
                    onPress={() => toggleChip(ti.refId)}
                    style={{
                      marginRight: 8,
                      borderWidth: 1.5,
                      borderColor: tickerColor,
                      borderRadius: 14,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: selected ? tickerColor : 'transparent',
                      opacity: selected ? 1 : 0.5,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? c.surface : tickerColor,
                        fontSize: 18,
                        fontFamily: 'InterSemiBold',
                        fontWeight: '600',
                      }}
                      numberOfLines={1}
                    >
                      {ti.title}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}

            {/* Optional menu directly above the directory list */}
            {aboveListComponent ? (
              <View style={{ paddingHorizontal: embedded ? 0 : (s.$1 as number) + 6, marginBottom: 10 }}>
                {aboveListComponent}
              </View>
            ) : null}

            {/* Natural scrolling list without surface2 backdrop */}
            <View>
              <FlatList
                ListHeaderComponent={
                  showOnboardingPill ? (
                    <OnboardingPill
                      userName={user?.userName || ''}
                      fullName={userDisplayName}
                      avatarUri={userAvatarUri}
                    />
                  ) : null
                }
                contentContainerStyle={{
                  paddingLeft: embedded ? embeddedPadding : (s.$1 as number) + 6,
                  paddingRight: embedded ? embeddedPadding : (s.$1 as number) + 6,
                  paddingTop: 10,
                  paddingBottom: 150,
                }}
                data={displayedUsers}
                keyExtractor={(u) => u.id}
                renderItem={renderItem}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={10}
                removeClippedSubviews={false}
                onEndReached={() => {
                  if (isLoading || !hasMore) return
                  void fetchPage(page + 1, { skipCache: true })
                }}
                onEndReachedThreshold={0.6}
                showsVerticalScrollIndicator={false}
                alwaysBounceVertical={true}
                bounces={true}
                nestedScrollEnabled={true}
                scrollEnabled={true}
                scrollEventThrottle={16}
                getItemLayout={(data, index) => ({ length: 90, offset: 90 * index, index })}
                updateCellsBatchingPeriod={50}
                disableVirtualization={false}
              />
            </View>
    </View>
  )
}
