import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, FlatList, ScrollView, ActivityIndicator } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { useIsFocused } from '@react-navigation/native'
import { s, c, t } from '@/features/style'
import { router, usePathname } from 'expo-router'
import { Image } from 'expo-image'
import { useAppStore } from '@/features/stores'
import type { DirectoryUser } from '@/features/stores/users'
import type { ExpandedItem, Profile } from '@/features/types'
import Svg, { Circle, Path } from 'react-native-svg'
import { enqueueIdleTask, IdleTaskHandle } from '@/features/utils/idleQueue'
import { InfiniteData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { directoryKeys, fetchDirectoryPage, fetchDirectoryTopRefs } from '@/features/queries/directory'
import { profileKeys, fetchProfileData, type ProfileData } from '@/features/queries/profile'
import { communityInterestsKeys, fetchCommunityInterestSummary } from '@/features/queries/communityInterests'
import { useWantToMeet } from '@/features/queries/wantToMeet'
import { Avatar } from '@/ui/atoms/Avatar'

const DIRECTORY_TICKER_COLOR = c.accent
// Listen for interests added from the CommunityInterestsScreen and update chips instantly
if (typeof globalThis !== 'undefined' && (globalThis as any).addEventListener) {
  try {
    ;(globalThis as any).removeEventListener?.('refs:new-interest', () => {})
    ;(globalThis as any).addEventListener('refs:new-interest', (e: any) => {
      try {
        const detail = e?.detail
        if (!detail?.id) return
        // Handler is overridden within component scope; kept as safety no-op.
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

const normalizeProfileRecord = (
  record?: Profile | (Profile & { _cachedUserId?: string }) | null
): Profile | undefined => {
  if (!record) return undefined
  const { _cachedUserId, ...rest } = record as Profile & { _cachedUserId?: string }
  return rest as Profile
}

const BookmarkIcon = ({ filled }: { filled: boolean }) => {
  const width = 36
  const height = 48
  const stroke = c.accent
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

const OnboardingPill = ({ userName, fullName, avatarUri }: { userName: string; fullName: string; avatarUri?: string }) => {
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
    if (!pathname || pathname !== expectedPath) {
      router.push({ pathname: '/user/[userName]', params: { userName, _t: Date.now().toString() } })
    }
  }, [homePagerIndex, pathname, setProfileNavIntent, userName])

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          {
            backgroundColor: c.surface,
            borderRadius: s.$1,
            paddingHorizontal: s.$1,
            paddingVertical: s.$075,
            marginBottom: s.$1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: s.$075,
            elevation: 2,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          },
          pillAnimatedStyle,
        ]}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: hasAvatar ? 'transparent' : c.surface2,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {hasAvatar && avatarUri ? (
            <Image source={avatarUri} style={{ width: 48, height: 48 }} contentFit="cover" />
          ) : (
            <Text style={{ color: c.muted, fontFamily: 'Inter', fontSize: s.$1 }}>+</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.newDark, fontSize: (s.$09 as number) + 2, fontFamily: 'InterBold', fontWeight: '700' }}>
            Finish your profile
          </Text>
          <Text style={{ color: c.muted, fontSize: s.$09, fontFamily: 'Inter', fontWeight: '400' }}>
            Add a photo and refs so {fullName} shows up here
          </Text>
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
  isVisible,
}: {
  u: FeedUser
  onPress: () => void
  onToggleSave: () => void
  isSaved: boolean
  userInterestMap: Map<string, Set<string>>
  refTitleMap: Map<string, string>
  currentUserId?: string
  innerLeftPadding?: number
  isVisible?: boolean
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
        <Avatar source={u.avatar_url} fallback={u.name} size={60} priority={isVisible ? 'must' : 'low'} />
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
  if (prevProps.isVisible !== nextProps.isVisible) return false
  return true
})

DirectoryRow.displayName = 'DirectoryRow'

const normalizeDirectoryUsers = (list: FeedUser[], currentUserName?: string) => {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const normalized: FeedUser[] = []

  for (const user of list) {
    if (!user) continue
    if (user.userName && user.userName === currentUserName) continue

    const rawId = user.id ?? user.userName
    if (!rawId) continue
    const stringId = String(rawId)
    if (seen.has(stringId)) continue

    seen.add(stringId)
    normalized.push({ ...user, id: stringId })
  }

  return normalized
}

type DirectoryPage = Awaited<ReturnType<typeof fetchDirectoryPage>>

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
  const {
    setProfileNavIntent,
    setDirectoriesFilterTab,
    user,
    addSave,
    removeSave,
    gridItemCount,
  } = useAppStore()

  const homePagerIndex = useAppStore((state) => state.homePagerIndex)
  const isFocused = useIsFocused()

  const { data: savedEntries = [] } = useWantToMeet(user?.id)

  const queryClient = useQueryClient()
  const [topInterests, setTopInterests] = useState<{ refId: string; title: string; count: number; created?: string }[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [userInterestMap, setUserInterestMap] = useState<Map<string, Set<string>>>(new Map())
  const [refTitleMap, setRefTitleMap] = useState<Map<string, string>>(new Map())
  const saveMapRef = useRef(new Map<string, string>())
  const [optimisticSaved, setOptimisticSaved] = useState<Map<string, boolean>>(new Map())

  const warmedProfileIdsRef = useRef<Set<string>>(new Set())
  const warmupHandlesRef = useRef<Map<string, IdleTaskHandle>>(new Map())
  const warmupsLaunchedRef = useRef(0)

  const pendingWarmupsRef = useRef<FeedUser[]>([])
  const pendingWarmupIdsRef = useRef(new Set<string>())
  const activeWarmupsRef = useRef(0)
  const warmupsEnabledRef = useRef(false)
  const schedulePendingWarmupsRef = useRef<() => void>(() => {})

  const WARMUP_CONCURRENCY = 1

  const MAX_DIRECTORY_WARMUPS = 2
  const WARMUP_ENABLE_DELAY_MS = 650
  const topRefQueueRef = useRef<string[]>([])
  const topRefHydratingRef = useRef(false)
  const hydratedTopRefsRef = useRef(new Set<string>())
  const warmupEnableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shouldWarmup = !embedded && isFocused && homePagerIndex === 1

  const {
    data,
    isLoading: isDirectoryLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: directoryKeys.all,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchDirectoryPage((pageParam as number) ?? 1),
    getNextPageParam: (lastPage: DirectoryPage, pages: DirectoryPage[]) =>
      lastPage.hasMore ? pages.length + 1 : undefined,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })

  const seedProfileQuery = useCallback(
    (userName: string, profileRecord?: Profile, gridItems?: ExpandedItem[], backlogItems?: ExpandedItem[]) => {
      if (!profileRecord || !Array.isArray(gridItems) || !Array.isArray(backlogItems)) return
      const profileData: ProfileData = {
        profile: profileRecord,
        gridItems,
        backlogItems,
      }
      queryClient.setQueryData<ProfileData>(profileKeys.detail(userName), profileData)
    },
    [queryClient]
  )

  const startWarmup = useCallback(
    (feedUser: FeedUser) => {
      const userId = feedUser.id
      if (!userId) return

      const handles = warmupHandlesRef.current
      const warmed = warmedProfileIdsRef.current

      activeWarmupsRef.current += 1
      warmupsLaunchedRef.current += 1

      const handle = enqueueIdleTask(async () => {
        try {
          const startedAt = Date.now()
          if (__DEV__) {
            console.log('[boot-trace] directoryWarmup:start', {
              userId,
              userName: feedUser.userName,
            })
          }

          const existing = queryClient.getQueryData<ProfileData>(profileKeys.detail(feedUser.userName))
          if (existing) {
            warmed.add(userId)
            return
          }

          const fetched = await fetchProfileData(feedUser.userName)
          const normalizedProfile = normalizeProfileRecord(fetched.profile)

          if (__DEV__) {
            console.log('[boot-trace] directoryWarmup:complete', {
              userId,
              userName: feedUser.userName,
              duration: Date.now() - startedAt,
              grid: fetched.gridItems.length,
              backlog: fetched.backlogItems.length,
            })
          }
          if (normalizedProfile) {
            seedProfileQuery(
              feedUser.userName,
              normalizedProfile,
              fetched.gridItems as ExpandedItem[],
              fetched.backlogItems as ExpandedItem[]
            )
          }

          warmed.add(userId)
        } catch (error) {
          if (__DEV__) {
            console.warn('Profile warmup failed:', feedUser.userName, error)
          }
        } finally {
          handles.delete(userId)
          activeWarmupsRef.current = Math.max(0, activeWarmupsRef.current - 1)
          schedulePendingWarmupsRef.current()
        }
      }, `directoryWarmup:${feedUser.userName}`)

      handles.set(userId, handle)
    },
    [seedProfileQuery]
  )

  const schedulePendingWarmups = useCallback(() => {
    if (!warmupsEnabledRef.current) return

    while (
      warmupsLaunchedRef.current < MAX_DIRECTORY_WARMUPS &&
      activeWarmupsRef.current < WARMUP_CONCURRENCY &&
      pendingWarmupsRef.current.length
    ) {
      const next = pendingWarmupsRef.current.shift()
      if (!next) {
        continue
      }
      if (next.id) {
        pendingWarmupIdsRef.current.delete(next.id)
      }
      startWarmup(next)
    }
  }, [startWarmup])

  useEffect(() => {
    schedulePendingWarmupsRef.current = schedulePendingWarmups
  }, [schedulePendingWarmups])

  const queueProfileWarmups = useCallback((feedUsers: FeedUser[]) => {
    const warmed = warmedProfileIdsRef.current
    const handles = warmupHandlesRef.current
    const pendingIds = pendingWarmupIdsRef.current

    for (const feedUser of feedUsers) {
      if (warmupsLaunchedRef.current + pendingWarmupsRef.current.length >= MAX_DIRECTORY_WARMUPS) {
        break
      }

      const userId = feedUser.id
      if (!userId || !feedUser.userName) continue
      if (warmed.has(userId) || handles.has(userId) || pendingIds.has(userId)) continue

      pendingWarmupsRef.current.push(feedUser)
      pendingIds.add(userId)
    }

    schedulePendingWarmupsRef.current()
  }, [])

  useEffect(() => {
    if (warmupEnableTimeoutRef.current) {
      clearTimeout(warmupEnableTimeoutRef.current)
      warmupEnableTimeoutRef.current = null
    }

    if (shouldWarmup) {
      warmupsEnabledRef.current = false
      warmupEnableTimeoutRef.current = setTimeout(() => {
        warmupsEnabledRef.current = true
        schedulePendingWarmupsRef.current()
      }, WARMUP_ENABLE_DELAY_MS)
    } else {
      warmupsEnabledRef.current = false
    }

    return () => {
      if (warmupEnableTimeoutRef.current) {
        clearTimeout(warmupEnableTimeoutRef.current)
        warmupEnableTimeoutRef.current = null
      }
    }
  }, [shouldWarmup])

  useEffect(() => {
    return () => {
      if (warmupEnableTimeoutRef.current) {
        clearTimeout(warmupEnableTimeoutRef.current)
        warmupEnableTimeoutRef.current = null
      }
      warmupHandlesRef.current.forEach((handle) => handle.cancel())
      warmupHandlesRef.current.clear()
      pendingWarmupsRef.current.length = 0
      pendingWarmupIdsRef.current.clear()
      activeWarmupsRef.current = 0
      warmupsEnabledRef.current = false
      schedulePendingWarmupsRef.current = () => {}
      topRefQueueRef.current.length = 0
      topRefHydratingRef.current = false
      warmupsLaunchedRef.current = 0
    }
  }, [])

  const directoryData = data as InfiniteData<DirectoryPage> | undefined

  const rawDirectoryUsers = useMemo<FeedUser[]>(() => {
    const aggregated = new Map<string, FeedUser>()
    for (const page of directoryData?.pages ?? []) {
      for (const entry of page.users) {
        aggregated.set(entry.id, {
          id: entry.id,
          userName: entry.userName,
          name: entry.name,
          neighborhood: entry.neighborhood,
          avatar_url: entry.avatarUrl,
          topRefs: entry.topRefs ?? [],
          _latest: entry.latest,
        })
      }
    }
    return Array.from(aggregated.values())
  }, [directoryData])

const processedUsers = useMemo(() => {
  const normalized = normalizeDirectoryUsers(rawDirectoryUsers, user?.userName)
  normalized.sort((a, b) => (b._latest ?? 0) - (a._latest ?? 0))
  return normalized
}, [rawDirectoryUsers, user?.userName])

const [visibleUserIds, setVisibleUserIds] = useState<string[]>([])
const visibleUserSet = useMemo(() => new Set(visibleUserIds), [visibleUserIds])

const onViewableItemsChanged = useCallback(
  ({ viewableItems }: { viewableItems: Array<{ item?: FeedUser | null }> }) => {
    const ids = viewableItems
      .map((entry) => entry.item?.id)
      .filter((id): id is string => typeof id === 'string')
    setVisibleUserIds(ids)
  },
  []
)
const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current


  useEffect(() => {
    if (!shouldWarmup) return
    queueProfileWarmups(processedUsers)
  }, [processedUsers, queueProfileWarmups, shouldWarmup])

  const flushTopRefQueue = useCallback(() => {
    if (!shouldWarmup) return
    if (topRefHydratingRef.current) return
    topRefHydratingRef.current = true

    const run = async () => {
      while (topRefQueueRef.current.length) {
        const batch = topRefQueueRef.current.splice(0, 3)
        try {
          const map = await fetchDirectoryTopRefs(batch)
          queryClient.setQueryData<InfiniteData<DirectoryPage>>(directoryKeys.all, (existing) => {
            if (!existing) return existing
            return {
              ...existing,
              pages: existing.pages.map((page) => ({
                ...page,
                users: page.users.map((entry) => {
                  const update = map.get(entry.id)
                  if (!update) return entry
                  return {
                    ...entry,
                    topRefs: update.refs,
                    latest: update.latest ?? entry.latest,
                  }
                }),
              })),
            }
          })
        } catch (error) {
          console.warn('Directory topRefs hydration failed', error)
        }
      }
      topRefHydratingRef.current = false
    }

    run().catch((error) => {
      console.warn('Directory topRefs hydration loop failed', error)
      topRefHydratingRef.current = false
    })
  }, [queryClient, shouldWarmup])

  useEffect(() => {
    if (!shouldWarmup) return
    const pending = processedUsers.filter((entry) => {
      if ((entry.topRefs?.length || 0) >= 3) return false
      return !hydratedTopRefsRef.current.has(entry.id)
    })
    if (!pending.length) return
    pending.forEach((entry) => {
      hydratedTopRefsRef.current.add(entry.id)
      if (!topRefQueueRef.current.includes(entry.id)) {
        topRefQueueRef.current.push(entry.id)
      }
    })
    flushTopRefQueue()
  }, [processedUsers, flushTopRefQueue, shouldWarmup])

  useEffect(() => {
    const map = new Map<string, string>()
    for (const save of savedEntries) {
      const savedUserId = save.expand?.user?.id || (save as any).user
      if (savedUserId) map.set(savedUserId, save.id)
    }
    saveMapRef.current = map
  }, [savedEntries])

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

  const toggleChip = useCallback((refId: string) => {
    setSelectedInterests((prev) => (prev.includes(refId) ? prev.filter((id) => id !== refId) : [...prev, refId]))
  }, [])

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

  const COMMUNITY = 'edge-patagonia'
  const interestQuery = useQuery({
    queryKey: communityInterestsKeys.summary(COMMUNITY),
    queryFn: () => fetchCommunityInterestSummary(COMMUNITY),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  })

  useEffect(() => {
    if (!interestQuery.data) return
    const { topInterests: summary, userInterestPairs, refTitlePairs } = interestQuery.data
    setTopInterests(summary.slice(0, 30))
    setUserInterestMap(new Map(userInterestPairs.map(([userId, refs]) => [userId, new Set(refs)])))
    setRefTitleMap(new Map(refTitlePairs))
  }, [interestQuery.data])

  useEffect(() => {
    // TODO: replace legacy wildcard realtime with scoped channel or lazy polling once Directory is visible.
    return () => {}
  }, [])

  const handleUserPress = useCallback(
    (userName: string, userId: string) => {
      if (!userName || !userId) return
      setDirectoriesFilterTab('people')
      setProfileNavIntent({ targetPagerIndex: 1, directoryFilter: 'people', source: 'directory' })
      router.push({ pathname: '/user/[userName]', params: { userName, userId, fromDirectory: '1' } })
    },
    [setDirectoriesFilterTab, setProfileNavIntent]
  )

  const renderItem = useCallback(
    ({ item }: { item: FeedUser; index: number }) => {
      const userVisible = visibleUserSet.has(item.id)
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
          isVisible={userVisible}
        />
      )
    },
    [handleUserPress, toggleSaveForUser, isUserSaved, userInterestMap, refTitleMap, user?.id, visibleUserSet]
  )

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

  const showOnboardingPill = gridItemCount < 3 && user?.userName

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {showHeader && (
        <View style={{ paddingVertical: s.$1, alignItems: 'flex-start', justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6, marginBottom: 0 }}>
          <Text style={{ color: c.newDark, fontSize: (s.$09 as number) + 4, fontFamily: 'System', fontWeight: '700', textAlign: 'left', lineHeight: s.$1half }}>
            Directory
          </Text>
          <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', textAlign: 'left', lineHeight: s.$1half }}>
            Edge Patagonia
          </Text>
        </View>
      )}

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

      {aboveListComponent ? (
        <View style={{ paddingHorizontal: embedded ? 0 : (s.$1 as number) + 6, marginBottom: 10 }}>
          {aboveListComponent}
        </View>
      ) : null}

      <View>
        <FlatList
          ListHeaderComponent={
            showOnboardingPill ? (
              <OnboardingPill userName={user?.userName || ''} fullName={userDisplayName} avatarUri={userAvatarUri} />
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
          maxToRenderPerBatch={6}
          windowSize={10}
          removeClippedSubviews={false}
          extraData={visibleUserIds}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={() => {
            if (!hasNextPage || isFetchingNextPage) return
            void fetchNextPage()
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
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: s.$1 }} color={c.accent} />
            ) : null
          }
        />
      </View>
    </View>
  )
}
