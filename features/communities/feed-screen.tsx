import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { View, Text, Pressable, FlatList, ListRenderItem, InteractionManager } from 'react-native'
import { s, c, t } from '@/features/style'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import { simpleCache } from '@/features/cache/simpleCache'
import Svg, { Circle } from 'react-native-svg'
import AsyncStorage from '@react-native-async-storage/async-storage'

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
const DirectoryRow = React.memo(({ u, onPress }: { u: FeedUser; onPress: () => void }) => {
  // Pre-compute thumbnails to avoid array operations during render
  const thumbnails = useMemo(() => {
    return (u.topRefs || []).slice(0, 3)
  }, [u.topRefs])
  
  return (
    <Pressable
      key={u.id}
      style={{
        backgroundColor: c.surface,
        borderRadius: s.$1,
        paddingVertical: (s.$1 as number) + 5, // Added 5px padding for taller entries
        paddingHorizontal: s.$08,
        marginBottom: s.$075,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 90, // Increased height to accommodate extra padding (80 + 10)
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

      <View style={{ flexDirection: 'row', gap: 6, marginLeft: s.$08 }}>
        {thumbnails.map((src, idx) => (
          <Image
            key={`${u.id}-thumb-${idx}`}
            source={src}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              backgroundColor: c.surface2,
            }}
            contentFit={'cover'}
            cachePolicy="memory-disk"
            transition={0}
            priority="low"
          />
        ))}
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

export function CommunitiesFeedScreen() {
  // Directories screen: paginated list of all users
  const [users, setUsers] = useState<FeedUser[]>([])
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [hasInitialData, setHasInitialData] = useState(false)
  const perPage = 50 // Increased from 30 to show more entries
  const pbRef = useRef<typeof pocketbase | null>(null)
  const { setHomePagerIndex, setReturnToDirectories, user } = useAppStore()
  
  // Performance monitoring
  const renderCount = useRef(0)
  renderCount.current++
  
  // Log render performance every 10 renders
  if (renderCount.current % 10 === 0) {
    console.log(`🔄 Directory rendered ${renderCount.current} times, users: ${users.length}`)
  }

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
    // Ensure returning back lands on Directories view
    setHomePagerIndex(1)

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

    loadAllPages()
    return () => { mounted = false }
  }, [])

  // Memoize the onPress callback to prevent recreation on every render
  const handleUserPress = useCallback((userName: string) => {
    if (userName) {
          // Ensure back returns to directories view
          setReturnToDirectories?.(true)
      // Use push to preserve native back swipe gesture
      router.push(`/user/${userName}`)
    }
  }, [setReturnToDirectories])

  const renderItem = useCallback(({ item, index }: { item: FeedUser; index: number }) => {
    return (
      <DirectoryRow 
        u={item} 
        onPress={() => handleUserPress(item.userName)} 
      />
    )
  }, [handleUserPress])

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Header sits outside the surface2 backdrop */}
      <View style={{ paddingVertical: s.$1, alignItems: 'flex-start', justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6 }}>
        <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', textAlign: 'left', lineHeight: s.$1half }}>
          viewing <Text style={{ fontWeight: '700' }}>Edge Patagonia</Text>
        </Text>
      </View>
      {/* Surface2 backdrop containing only results, inset 10px from screen edges with 10px inner padding and rounded shoulders; lifted above dots */}
      <View style={{ flex: 1, backgroundColor: c.surface2, marginHorizontal: 10, borderRadius: s.$1, overflow: 'hidden', marginBottom: 115, marginTop: 10 }}>
        <View style={{ flex: 1, paddingHorizontal: 5, paddingTop: 10, paddingBottom: 10 }}>
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 0 }}
          data={processedUsers}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          getItemLayout={(data, index) => ({
            length: 90, // Updated height for each row (60px avatar + 30px padding)
            offset: 90 * index,
            index,
          })}
          updateCellsBatchingPeriod={50}
          disableVirtualization={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
        </View>
      </View>
    </View>
  )
}

