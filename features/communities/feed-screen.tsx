import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { View, Text, Pressable, FlatList, InteractionManager, Dimensions, ScrollView } from 'react-native'
import { s, c } from '@/features/style'
import { router } from 'expo-router'
import { Grid } from '@/ui/grid/Grid'
// import { Button } from '@/ui/buttons/Button'
// import BottomSheet from '@gorhom/bottom-sheet'
// import { CommunityFormSheet } from '@/ui/communities/CommunityFormSheet'
import { Image } from 'expo-image'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import type { DirectoryUser } from '@/features/stores/users'
import { simpleCache } from '@/features/cache/simpleCache'
import Svg, { Circle } from 'react-native-svg'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
const DirectoryRow = React.memo(({ u, onPress, userInterestMap, refTitleMap, currentUserId, innerLeftPadding }: { u: FeedUser; onPress: () => void; userInterestMap: Map<string, Set<string>>; refTitleMap: Map<string, string>; currentUserId?: string; innerLeftPadding?: number }) => {
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

  const pillPadding = innerLeftPadding ?? (s.$1 as number)
  const pillRightPadding = s.$1 as number
  const avatarSize = s.$3 as number

  return (
    <Pressable
      key={u.id}
      style={{
        backgroundColor: c.surface2,
        borderRadius: 12,
        paddingVertical: 15,
        paddingLeft: pillPadding,
        paddingRight: pillRightPadding,
        marginBottom: (s.$075 as number) + 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.$05, flex: 1 }}>
        {u.avatar_url ? (
          <Image
            source={u.avatar_url}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
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
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: c.surface2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Svg width={32} height={20} viewBox="0 0 64 40">
              <Circle cx="24" cy="20" r="16" fill="none" stroke={c.muted} strokeWidth="2" />
              <Circle cx="40" cy="20" r="16" fill="none" stroke={c.muted} strokeWidth="2" />
            </Svg>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 5, gap: 2 }}>
          <Text
            style={{
              fontSize: (s.$09 as number) + 2,
              fontWeight: '700',
              color: c.muted,
              textAlign: 'left',
              lineHeight: (s.$09 as number) + 6,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {u.name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: c.muted,
              textAlign: 'left',
              lineHeight: 18,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {u.neighborhood || 'Neighborhood'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginLeft: s.$05 }}>
        {overlapLabel && (
          <View style={{
            borderWidth: 1.5,
            borderColor: 'rgba(176,176,176,0.5)',
            borderRadius: 14,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: 'transparent',
          }}>
            <Text style={{ color: c.prompt, opacity: 0.5, fontSize: (s.$09 as number) - 2, fontWeight: '700' }} numberOfLines={1}>
              {overlapLabel}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}, (prevProps, nextProps) => {
  // Simple comparison - only re-render if user ID changes
  // This prevents unnecessary re-renders during scroll
  return prevProps.u.id === nextProps.u.id
})

DirectoryRow.displayName = 'DirectoryRow'

// Ensure we only schedule profile preloading once per app session
let hasScheduledProfilePreload = false

const win = Dimensions.get('window')
const BASE_DIRECTORY_LIST_HEIGHT = Math.max(360, Math.min(560, win.height - 220))
const DIRECTORY_LIST_HEIGHT = Math.max(200, BASE_DIRECTORY_LIST_HEIGHT - 50)
const EMBEDDED_LEFT_PADDING = 30
const EMBEDDED_RIGHT_PADDING = 30

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

export function CommunitiesFeedScreen({ showHeader = true, aboveListComponent, hideInterestChips = false, embedded = false }: { showHeader?: boolean; aboveListComponent?: React.ReactNode; hideInterestChips?: boolean; embedded?: boolean }) {
  // Directories screen: paginated list of all users
  const {
    setProfileNavIntent,
    setDirectoriesFilterTab,
    user,
    directoryUsers,
    setDirectoryUsers,
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
    const result: (FeedUser & { _latest?: number })[] = []
    for (const r of userRecords) {
      const creatorId = r.id
      const creatorItems = itemsByCreator.get(creatorId) || []
      if (creatorItems.length === 0) continue
      const images = creatorItems
        .slice(0, 3)
        .map((it) => it?.image || it?.expand?.ref?.image)
        .filter(Boolean)
      const latest = creatorItems[0]?.created ? new Date(creatorItems[0].created).getTime() : 0
      result.push({
        id: r.id,
        userName: r.userName,
        name: r.firstName || r.name || r.userName,
        neighborhood: r.location || '',
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
          console.log('📖 Using cached directory users')
          commitUsers(cachedUsers as FeedUser[])
          setHasMore(true) // Assume there are more pages
          setPage(1)
          setIsLoading(false)
          return
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
          commitUsers(cachedUsers as FeedUser[])
          setHasInitialData(true)
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

  const renderItem = useCallback(({ item, index }: { item: FeedUser; index: number }) => {
    return (
      <DirectoryRow 
        u={item} 
        onPress={() => handleUserPress(item.userName, item.id)} 
        userInterestMap={userInterestMap}
        refTitleMap={refTitleMap}
        currentUserId={user?.id}
        innerLeftPadding={s.$1 as number}
      />
    )
  }, [handleUserPress])

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {showHeader && (
        // Header: independent from list scroll; surface background
        <View style={{ paddingVertical: s.$1, alignItems: 'flex-start', justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6, marginBottom: -5 }}>
          <Text style={{ color: c.prompt, fontSize: (s.$09 as number) + 4, fontFamily: 'System', fontWeight: '700', textAlign: 'left', lineHeight: s.$1half }}>
            Directory
          </Text>
        <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', textAlign: 'left', lineHeight: s.$1half }}>
            Edge Patagonia
        </Text>
      </View>
      )}

            {/* Ticker filter chips (popular interests) as subheader under viewing */}
            {hideInterestChips ? null : (
              <View style={{ paddingLeft: s.$1 + 6, paddingTop: 0, paddingBottom: 24, marginTop: 0 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: s.$1 }}>
                  {topInterests.map((ti) => {
                    const selected = selectedInterests.includes(ti.refId)
                    return (
                      <Pressable
                        key={ti.refId}
                        onPress={() => toggleChip(ti.refId)}
                        style={{
                          marginRight: 8,
                          borderWidth: 1.5,
                          borderColor: selected ? c.prompt : 'rgba(176,176,176,0.5)',
                          borderRadius: 14,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: selected ? c.prompt : 'transparent',
                        }}
                      >
                        <Text style={{ color: selected ? c.surface : c.prompt, opacity: selected ? 1 : 0.5, fontSize: (s.$09 as number) - 2 }} numberOfLines={1}>
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
              <View
                style={{
                  paddingLeft: embedded ? EMBEDDED_LEFT_PADDING : (s.$1 as number) + 6,
                  paddingRight: embedded ? EMBEDDED_RIGHT_PADDING : (s.$1 as number) + 6,
                  marginBottom: 10,
                }}
              >
                {aboveListComponent}
              </View>
            ) : null}

            {/* Natural scrolling list without surface2 backdrop */}
            <View>
              <FlatList
                contentContainerStyle={{
                  paddingLeft: embedded ? EMBEDDED_LEFT_PADDING : (s.$1 as number) + 6,
                  paddingRight: embedded ? EMBEDDED_RIGHT_PADDING : (s.$1 as number) + 6,
                  paddingTop: 5,
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
