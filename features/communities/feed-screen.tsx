import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { View, Text, Pressable, FlatList, ListRenderItem, InteractionManager, Dimensions, ScrollView } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { s, c, t } from '@/features/style'
import { router } from 'expo-router'
import { Grid } from '@/ui/grid/Grid'
// import { Button } from '@/ui/buttons/Button'
// import BottomSheet from '@gorhom/bottom-sheet'
// import { CommunityFormSheet } from '@/ui/communities/CommunityFormSheet'
import { Image } from 'expo-image'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
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
const DirectoryRow = React.memo(({ u, onPress, userInterestMap, refTitleMap, currentUserId }: { u: FeedUser; onPress: () => void; userInterestMap: Map<string, Set<string>>; refTitleMap: Map<string, string>; currentUserId?: string }) => {
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
        backgroundColor: c.surface,
        borderRadius: s.$1,
        paddingVertical: s.$1,
        paddingHorizontal: s.$08,
        marginBottom: s.$075,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 80,
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
        <View style={{ flex: 1, marginLeft: 5, gap: 4 }}>
          <Text style={[t.psemi, { fontSize: (s.$09 as number) + 4 }]} numberOfLines={1} ellipsizeMode="tail">
            {u.name}
          </Text>
          <Text style={[t.smallmuted, { opacity: 0.6 }]} numberOfLines={1} ellipsizeMode="tail">
            {u.neighborhood || 'Neighborhood'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginLeft: s.$08 }}>
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

export function CommunitiesFeedScreen({ showHeader = true, aboveListComponent, hideInterestChips = false }: { showHeader?: boolean; aboveListComponent?: React.ReactNode; hideInterestChips?: boolean }) {
  // Directories screen: paginated list of all users
  const [users, setUsers] = useState<FeedUser[]>([])
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
  const { setReturnToDirectories, user } = useAppStore()
  const getPB = () => {
    if (!pbRef.current) pbRef.current = pocketbase
    return pbRef.current
  }

  const mapUsersWithItems = useCallback((userRecords: any[], itemsByCreator: Map<string, any[]>) => {
    const result: (FeedUser & { _latest?: number })[] = []
    for (const r of userRecords) {
      const creatorId = r.id
      const creatorItems = itemsByCreator.get(creatorId) || []
      if (creatorItems.length === 0) continue // require at least 1 grid item
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

  const fetchPage = useCallback(async (targetPage: number) => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    
    try {
      // Check cache for first page only
      if (targetPage === 1) {
        const cachedUsers = await simpleCache.get('directory_users')
        if (cachedUsers) {
          console.log('📖 Using cached directory users')
          setUsers(cachedUsers as any[])
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
      
      const newUsers = targetPage === 1 ? filteredMapped : [...users, ...filteredMapped]
      setUsers(newUsers)
      // Allow loading all pages; don't artificially cap at 50
      setHasMore(res.page < res.totalPages)
      setPage(res.page)
      
      // Set initial data flag when we successfully fetch data
      if (targetPage === 1) {
        setHasInitialData(true)
      }
      
      // Cache first page data for quick access (silent operation)
      if (targetPage === 1) {
        simpleCache.set('directory_users', filteredMapped).catch(error => {
          console.warn('Directory cache write failed:', error)
        })
      }
    } catch (e) {
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [hasMore, isLoading, user, mapUsersWithItems, users])

  useEffect(() => {
    let mounted = true

    const loadAllPages = async () => {
      try {
        const cachedUsers = await simpleCache.get('directory_users')
        if (mounted && cachedUsers && Array.isArray(cachedUsers) && cachedUsers.length > 0) {
          console.log('📖 Using cached directory users')
          setUsers(cachedUsers as FeedUser[])
          setHasInitialData(true)
        }

        // Fetch all pages to surface all users with at least 1 ref
        const pb = getPB()
        let current = 1
        let totalPages = 1
        const aggregated: FeedUser[] = []

        while (current <= totalPages) {
          const res = await pb.collection('users').getList(current, perPage, {
            fields: 'id,userName,firstName,lastName,name,location,image,avatar_url',
            sort: '-created',
          })

          totalPages = res.totalPages

          const userIds = res.items.map((u: any) => u.id)
          if (userIds.length > 0) {
            const orFilter = userIds.map((id: string) => `creator = "${id}"`).join(' || ')
            const perPageItems = Math.max(3 * userIds.length, 60)
            const itemsRes = await pb.collection('items').getList(1, perPageItems, {
              filter: `(${orFilter}) && backlog = false && list = false && parent = null`,
              fields: 'id,image,creator,created,expand.ref(image)',
              expand: 'ref',
              sort: '-created',
            })

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

            const mapped = mapUsersWithItems(res.items, byCreator).filter(u => u.userName !== user?.userName)

            // Deduplicate by id as we aggregate
            const seen = new Set(aggregated.map(u => u.id))
            for (const u of mapped) {
              if (!seen.has(u.id)) {
                aggregated.push(u)
                seen.add(u.id)
              }
            }

            if (mounted) {
              setUsers(prev => {
                const prevSeen = new Set(prev.map(p => p.id))
                const appended = mapped.filter(m => !prevSeen.has(m.id))
                return prev.length === 0 ? mapped : [...prev, ...appended]
              })
              setHasInitialData(true)
            }
          }

          current += 1
          // Yield to UI thread to avoid jank between pages
          await new Promise((r) => setTimeout(r, 0))
        }

        // Cache the complete directory list
        simpleCache.set('directory_users', aggregated).catch(() => {})
        if (mounted) {
          setHasMore(false)
          setPage(totalPages)
        }
      } catch (e) {
        // Fallback to first page if loop fails
        if (mounted) {
    fetchPage(1)
        }
      }
    }

    const handle = InteractionManager.runAfterInteractions(() => {
      if (!mounted) return
      void loadAllPages()
    })

    return () => {
      mounted = false
      handle.cancel()
    }
  }, [mapUsersWithItems, perPage, user?.userName])

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
  const handleUserPress = useCallback((userName: string) => {
    if (userName) {
          // Ensure back returns to directories view
          setReturnToDirectories?.(true)
      // Use push to preserve native back swipe gesture
      router.push(`/user/${userName}`)
    }
  }, [setReturnToDirectories])

  // Community tile press handler not used in this screen

  const renderItem = useCallback(({ item, index }: { item: FeedUser; index: number }) => {
    return (
      <DirectoryRow 
        u={item} 
        onPress={() => handleUserPress(item.userName)} 
        userInterestMap={userInterestMap}
        refTitleMap={refTitleMap}
        currentUserId={user?.id}
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
              <View style={{ paddingHorizontal: s.$1 + 6, marginBottom: 10 }}>
                {aboveListComponent}
              </View>
            ) : null}

            {/* Natural scrolling list without surface2 backdrop */}
            <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)} key={`list-${selectedInterests.join(',')}-${displayedUsers.length}`}> 
              <FlatList
                contentContainerStyle={{ paddingLeft: (s.$1 as number) + 6, paddingRight: (s.$1 as number) + 6, paddingTop: 5, paddingBottom: 150 }}
                data={displayedUsers}
                keyExtractor={(u) => u.id}
                renderItem={renderItem}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={10}
                removeClippedSubviews={false}
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
            </Animated.View>
    </View>
  )
}
