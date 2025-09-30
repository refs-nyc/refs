import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { View, Text, Dimensions, Pressable, FlatList, ScrollView, RefreshControl, InteractionManager } from 'react-native'
import { s, c } from '@/features/style'
import { pocketbase } from '@/features/pocketbase'
import BottomSheet from '@gorhom/bottom-sheet'
import { CommunityFormSheet } from '@/ui/communities/CommunityFormSheet'
import { useAppStore } from '@/features/stores'
import type { ReferencersContext } from '@/features/stores/types'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/features/supabase/client'
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation } from 'react-native-reanimated'
import { Animated as RNAnimated, Pressable as RNPressable } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { CommunitiesFeedScreen as DirectoryScreen } from '@/features/communities/feed-screen'
import { OvalJaggedAddButton } from '@/ui/buttons/OvalJaggedAddButton'
import { Avatar } from '@/ui/atoms/Avatar'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { SearchLoadingSpinner } from '@/ui/atoms/SearchLoadingSpinner'

const win = Dimensions.get('window')
const BADGE_OVERHANG = 8
const COMMUNITY_SLUG = 'edge-patagonia'
const PEOPLE_TABS_FADE_WIDTH = 60
const PEOPLE_SEARCH_BUTTON_RIGHT_OFFSET = -10
const PEOPLE_SEARCH_BUTTON_TOP = -6
const PEOPLE_SEARCH_CONTENT_PADDING = 85
const PEOPLE_LEFT_INSET = 29

type CommunityCacheState = {
  items: any[]
  filtered: any[]
  filterTab: 'popular' | 'people' | null
  contentTab: 'all' | 'new' | 'mine'
  subscriptions: Array<[string, boolean]>
  subscriptionCounts: Array<[string, number]>
}

const communityCache: CommunityCacheState = {
  items: [],
  filtered: [],
  filterTab: null,
  contentTab: 'all',
  subscriptions: [],
  subscriptionCounts: [],
}

// Ensure each FlatList cell allows overflow so badges can overhang
const VisibleCell = (props: any) => {
  const { style, ...rest } = props as any
  return <View {...rest} style={[style, { overflow: 'visible' }]} />
}

export function CommunityInterestsScreen() {
  const {
    user,
    setCurrentRefId,
    referencersBottomSheetRef,
    setReferencersContext,
    directoriesFilterTab,
    setDirectoriesFilterTab,
  } = useAppStore()
  const initialFilterTab =
    communityCache.filterTab !== null ? communityCache.filterTab : directoriesFilterTab ?? 'popular'
  const [communityItems, setCommunityItems] = useState<any[]>(() => communityCache.items)
  const [filteredItems, setFilteredItems] = useState<any[]>(() =>
    communityCache.filtered.length ? communityCache.filtered : communityCache.items
  )
  const [filterTab, setFilterTab] = useState<'popular' | 'people' | null>(initialFilterTab)
  const [contentTab, setContentTab] = useState<'all' | 'new' | 'mine'>(communityCache.contentTab)
  const [justAddedTitle, setJustAddedTitle] = useState<string | null>(null)
  const [subscriptionCounts, setSubscriptionCounts] = useState<Map<string, number>>(
    () => new Map(communityCache.subscriptionCounts)
  )
  const [rowWidths, setRowWidths] = useState<Record<string, number>>({})
  const communityFormRef = useRef<BottomSheet>(null)
  // Subscriptions (local interim): map of refId -> true (persisted per-user via AsyncStorage)
  const [subscriptions, setSubscriptions] = useState<Map<string, boolean>>(
    () => new Map(communityCache.subscriptions)
  )
  const [lastPillRefId, setLastPillRefId] = useState<string | null>(null)
  // Simple scale refs for press feedback per-item
  const scaleRefs = useRef<Record<string, any>>({}).current
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null)
  // Flip progress for Interests (front) -> People/Directory (back)
  const flipProgress = useSharedValue(0)

  const openAddInterestSheet = useCallback(() => {
    try { communityFormRef.current?.expand() } catch {}
  }, [])


  useEffect(() => {
    flipProgress.value = withTiming(filterTab === 'people' ? 1 : 0, { duration: 260 })
  }, [filterTab])

  useEffect(() => {
    communityCache.items = communityItems
  }, [communityItems])

  useEffect(() => {
    communityCache.filtered = filteredItems
  }, [filteredItems])

  useEffect(() => {
    communityCache.filterTab = filterTab
  }, [filterTab])

  useEffect(() => {
    communityCache.contentTab = contentTab
  }, [contentTab])

  useEffect(() => {
    communityCache.subscriptions = Array.from(subscriptions.entries())
  }, [subscriptions])

  useEffect(() => {
    communityCache.subscriptionCounts = Array.from(subscriptionCounts.entries())
  }, [subscriptionCounts])

  useEffect(() => {
    if (!directoriesFilterTab) return
    setFilterTab((prev) => (prev === directoriesFilterTab ? prev : directoriesFilterTab))
  }, [directoriesFilterTab])

  useEffect(() => {
    if (!filterTab) return
    setDirectoriesFilterTab(filterTab)
  }, [filterTab, setDirectoriesFilterTab])

  const frontStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 90])}deg` },
      ],
      opacity: interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 0], Extrapolation.CLAMP),
    }
  })

  const backStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 800 },
        { rotateY: `${interpolate(flipProgress.value, [0, 1], [-90, 0])}deg` },
      ],
      opacity: interpolate(flipProgress.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
    }
  })

  useEffect(() => {
    let unsub: any | null = null
    let cancelled = false
    const COMMUNITY = 'edge-patagonia'

    const mapRefToItem = (r: any) => ({
      id: r.id,
      ref: r.id,
      image: '',
      text: '',
      url: '',
      list: false,
      backlog: false,
      created: r.created,
      updated: r.updated,
      expand: { ref: { ...r, image: '' } },
      __promptKind: 'interest',
      __emphasized: typeof r?.meta === 'string' && r.meta.includes('"emphasized":true'),
    })

    const handleEvent = (e: any) => {
      if (cancelled) return
      try {
        const r = e.record
        const isCommunity = typeof r?.meta === 'string' && r.meta.includes(COMMUNITY)
        if (!isCommunity) return
        setCommunityItems((prev) => {
          let next = prev.slice()
          if (e.action === 'create' || e.action === 'update') {
            const item = mapRefToItem(r)
            const idx = next.findIndex((x) => x.id === item.id)
            if (idx >= 0) next[idx] = item
            else next = [item, ...next]
          } else if (e.action === 'delete') {
            next = next.filter((x) => x.id !== r.id)
          }
          next.sort((a, b) => (b.created || '').localeCompare(a.created || ''))
          return next
        })
      } catch {}
    }

    const loadUserSubscriptions = async () => {
      try {
        if (!user?.id) return
        const key = `community_subs:${user.id}:edge-patagonia`
        const sb: any = (supabase as any).client
        let refIds: string[] | null = null
        if (sb) {
          const resp = await sb
            .from('community_subscriptions')
            .select('ref_id')
            .eq('user_id', user.id)
            .eq('community', 'edge-patagonia')
          if (!resp.error && Array.isArray(resp.data)) {
            refIds = resp.data.map((r: any) => r.ref_id)
            await AsyncStorage.setItem(key, JSON.stringify(refIds))
          }
        }
        if (!refIds) {
          const raw = await AsyncStorage.getItem(key)
          if (raw) refIds = JSON.parse(raw)
        }
        if (cancelled) return
        if (Array.isArray(refIds)) {
          const map = new Map<string, boolean>()
          for (const id of refIds) map.set(id, true)
          setSubscriptions(map)
        }
      } catch (e) {
        if (__DEV__) console.warn('Subscriptions load failed:', e)
      }
    }

    const load = async () => {
      try {
        const sb: any = (supabase as any).client
        const [refs, countRows] = await Promise.all([
          pocketbase.collection('refs').getFullList({
            filter: pocketbase.filter('meta ~ {:community}', { community: COMMUNITY }),
            sort: '-created',
          }),
          sb
            ? sb
                .from('community_subscriptions')
                .select('ref_id')
                .eq('community', COMMUNITY)
            : Promise.resolve({ data: [] }),
        ])

        if (cancelled) return

        const counts = new Map<string, number>()
        const rows = (countRows as any)?.data || []
        for (const row of rows) {
          const id = row.ref_id
          counts.set(id, (counts.get(id) || 0) + 1)
        }
        setSubscriptionCounts(counts)

        const mapped = refs.map(mapRefToItem)
        setCommunityItems(mapped)
        setFilteredItems(mapped)
      } catch (e) {
        console.warn('Failed to load community refs', e)
      }
    }

    const task = InteractionManager.runAfterInteractions(async () => {
      await load()
      if (cancelled) return
      try {
        unsub = await pocketbase.collection('refs').subscribe('*', handleEvent)
      } catch {}
      if (cancelled) return
      await loadUserSubscriptions()
    })

    return () => {
      cancelled = true
      task.cancel()
      if (typeof unsub === 'function') {
        try { unsub() } catch {}
      }
    }
  }, [user?.id])

  const computeFilteredItems = useCallback(
    (
      tab: 'all' | 'new' | 'mine',
      subs: Map<string, boolean>,
      items: any[]
    ): any[] => {
      if (tab === 'mine') {
        return items.filter((it) => subs.has(it.ref || it.id))
      }

      let list = items
      if (tab === 'new') {
        list = list.filter((it) => (subscriptionCounts.get(it.ref || it.id) || 0) <= 2)
      }
      return list
    },
    [subscriptionCounts]
  )

  // Keep filteredItems in sync with current data and filter selection
  useEffect(() => {
    setFilteredItems(computeFilteredItems(contentTab, subscriptions, communityItems))
  }, [communityItems, subscriptions, contentTab, computeFilteredItems])

  // Toggle subscription
  const toggleSubscription = useCallback(
    async (item: any, options?: { forceSubscribe?: boolean }) => {
      const refId = item?.ref || item?.id
      if (!refId || !user?.id) return
      const key = `community_subs:${user.id}:edge-patagonia`
      const { forceSubscribe } = options ?? {}
      setSubscriptions((prev) => {
        const isSubscribed = prev.has(refId)
        const shouldSubscribe = forceSubscribe ? true : !isSubscribed
        if (shouldSubscribe === isSubscribed) {
          return prev
        }

        const next = new Map(prev)
        if (shouldSubscribe) {
          next.set(refId, true)
        } else {
          next.delete(refId)
        }

        const title = item?.expand?.ref?.title || item?.title || ''
        setJustAddedTitle(`${shouldSubscribe ? 'added' : 'unsubscribed'} ${title}`)
        setLastPillRefId(refId)

        const arr = Array.from(next.keys())
        AsyncStorage.setItem(key, JSON.stringify(arr)).catch(() => {})

        ;(async () => {
          try {
            const sb: any = (supabase as any).client
            if (!sb) return
            if (shouldSubscribe) {
              await sb
                .from('community_subscriptions')
                .upsert({ user_id: user.id, ref_id: refId, community: 'edge-patagonia' }, { onConflict: 'user_id,ref_id' })
            } else {
              await sb
                .from('community_subscriptions')
                .delete()
                .match({ user_id: user.id, ref_id: refId })
            }
          } catch {}
        })()

        setFilteredItems(computeFilteredItems(contentTab, next, communityItems))

        const duration = shouldSubscribe ? 2500 : 1500
        setTimeout(() => setJustAddedTitle(null), duration)

        setSubscriptionCounts((prevCounts) => {
          const nextCounts = new Map(prevCounts)
          const current = nextCounts.get(refId) || 0
          const delta = shouldSubscribe ? 1 : -1
          nextCounts.set(refId, Math.max(0, current + delta))
          return nextCounts
        })

        return next
      })
    },
    [user?.id, contentTab, communityItems, computeFilteredItems]
  )

  // Open referencers sheet
  const openReferencers = useCallback(
    (item: any, context: ReferencersContext = null) => {
      const refId = item?.ref || item?.id
      if (!refId) return
      try {
        setCurrentRefId(refId)
      } catch {}
      try {
        setReferencersContext(context)
      } catch {}
      try {
        referencersBottomSheetRef.current?.expand()
      } catch {}
    },
    [setCurrentRefId, referencersBottomSheetRef, setReferencersContext]
  )

  // Filter tabs: Corkboard vs People (Mine removed since it's below)
  const FilterTabs = () => (
    <View style={{ flexDirection: 'row', paddingLeft: s.$1 + 6, marginTop: -8, marginBottom: 10 }}>
      {(['popular', 'people'] as const).map((tab) => {
        const active = filterTab === tab
        return (
          <Pressable
            key={tab}
            onPress={() => {
              const nextTab = active ? null : tab
              setFilterTab(nextTab)
              if (nextTab === 'popular' || nextTab === null) {
                setContentTab('all')
                setFilteredItems(computeFilteredItems('all', subscriptions, communityItems))
              } else if (nextTab === 'people') {
                // no-op for data; the flip animation reveals the directory view
              }
            }}
            style={{
              marginRight: 8,
              borderWidth: 1.5,
              borderColor: active ? c.prompt : 'rgba(176,176,176,0.5)',
              borderRadius: 14,
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: active ? c.prompt : 'transparent',
            }}
          >
            <Text style={{ color: active ? c.surface : c.prompt, opacity: active ? 1 : 0.5, fontSize: (s.$09 as number) - 2, fontWeight: '700' }}>
              {tab === 'popular' ? 'corkboard' : tab}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )

  // Plain text tabs above the list: All | New | Mine
  const PlainTabs = () => {
    const tabs: { key: 'all' | 'new' | 'mine'; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'new', label: 'New' },
      { key: 'mine', label: 'Mine' },
    ]
    return (
      <View style={{ flexDirection: 'row', paddingTop: 25, marginBottom: 10 }}>
        {tabs.map((t, idx) => {
          const active = contentTab === t.key
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                setContentTab(t.key)
                // Avoid flash by updating list immediately on tab change
                setFilteredItems(computeFilteredItems(t.key, subscriptions, communityItems))
              }}
              style={{ marginRight: idx < tabs.length - 1 ? 16 : 0 }}
            >
              <Text style={{
                color: c.prompt,
                opacity: active ? 1 : 0.5,
                fontSize: s.$09,
                textDecorationLine: active ? 'underline' : 'none',
              }}>
                {t.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    )
  }

  // People tabs (UI only for parity)
  const PeopleTabs = ({ showSearchButton }: { showSearchButton: boolean }) => {
    const [activeTab, setActiveTab] = useState<string>('All')
    const tabs = ['All', 'Bio', 'Crypto', 'Longevity', 'Tennis', 'New Cities']
    return (
        <View style={{ paddingTop: 28, marginBottom: 10 }}>
        <View style={{ position: 'relative', overflow: 'hidden', paddingLeft: PEOPLE_LEFT_INSET-27 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: showSearchButton ? PEOPLE_SEARCH_CONTENT_PADDING : 0 }}
          >
            <View style={{ flexDirection: 'row' }}>
              {tabs.map((label, idx) => {
                const active = label === activeTab
                const isLast = idx === tabs.length - 1
                return (
                  <Pressable
                    key={label}
                    onPress={() => setActiveTab(label)}
                    style={{ marginRight: isLast ? 0 : 16 }}
                    hitSlop={8}
                  >
                    <Text style={{ color: c.prompt, opacity: active ? 1 : 0.5, fontSize: s.$09, textDecorationLine: active ? 'underline' : 'none' }}>{label}</Text>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
          <Svg
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, right: (showSearchButton ? PEOPLE_SEARCH_CONTENT_PADDING - 20 : 0) + 5, height: '100%' }}
            width={PEOPLE_TABS_FADE_WIDTH}
            height="100%"
          >
            <Defs>
              <LinearGradient id="peopleTabsFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={c.surface} stopOpacity={0} />
                <Stop offset="0.6" stopColor={c.surface} stopOpacity={0.6} />
                <Stop offset="1" stopColor={c.surface} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={PEOPLE_TABS_FADE_WIDTH} height="100%" fill="url(#peopleTabsFade)" />
          </Svg>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Header + upper ticker (front only) */}
      <View>
        {/* Header */}
        <View style={{ paddingVertical: s.$1, justifyContent: 'center', marginTop: 7, paddingLeft: s.$1 + 6, paddingRight: s.$1 + 6, marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'column' }}>
              <Text style={{ color: c.prompt, fontSize: (s.$09 as number) + 4, fontFamily: 'System', fontWeight: '700', textAlign: 'left', lineHeight: s.$1half }}>
                Edge Patagonia
              </Text>
            </View>
          </View>
        </View>

        {/* Filter ticker */}
        <FilterTabs />
      </View>

      {/* Flip container: Interests (front) and People/Directory (back) */}
      <View style={{ flex: 1, paddingHorizontal: s.$1 + 6, paddingTop: 6, position: 'relative' }}>
        {/* FRONT: Interests list */}
        {/* Plain text tabs just above the interest pills */}
        <Animated.View style={[frontStyle]} pointerEvents={filterTab === 'people' ? 'none' as any : 'auto' as any}>
          <PlainTabs />
        </Animated.View>
        <Animated.View key={`list-${filterTab ?? 'all'}-${filteredItems.length}`} style={[frontStyle]} pointerEvents={filterTab === 'people' ? 'none' as any : 'auto' as any}>
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingTop: (s.$075 as number) + 2,
              paddingBottom: (s.$075 as number) + 1,
              paddingRight: 0,
            }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            CellRendererComponent={VisibleCell as any}
            ListEmptyComponent={
              contentTab === 'mine'
                ? () => (
                    <View style={{ paddingVertical: s.$2, alignItems: 'center', paddingHorizontal: s.$1 }}>
                      <Text style={{ color: c.grey2, textAlign: 'center', fontWeight: '600' }}>
                        You haven't subscribed to any community interests!
                      </Text>
                    </View>
                  )
                : undefined
            }
            renderItem={({ item, index }) => {
              const refId = item?.ref || item?.id
              const count = subscriptionCounts.get(refId) || 0
              const emphasized = count <= 2
              const isMineView = contentTab === 'mine'
              const isSubscribed = subscriptions.has(refId)
              const showNewBadge = !isSubscribed && !isMineView && emphasized
              return (
                <Animated.View style={{ position: 'relative', marginBottom: (s.$075 as number) + 2, paddingRight: BADGE_OVERHANG + 2 }} onLayout={(e) => {
                  try {
                    const w = e.nativeEvent.layout.width
                    if (w && rowWidths[item.id] !== w) {
                      setRowWidths((prev) => ({ ...prev, [item.id]: w }))
                    }
                  } catch {}
                }}>
                  <RNAnimated.View style={{ transform: [{ scale: scaleRefs[item.id] || 1 }] }}>
                  <RNPressable
                    onPressIn={() => {
                      try {
                        ;(scaleRefs[item.id] || (scaleRefs[item.id] = new RNAnimated.Value(1))) && RNAnimated.spring(scaleRefs[item.id], { toValue: 0.96, useNativeDriver: true }).start()
                      } catch {}
                    }}
                    onPressOut={() => {
                      try {
                        scaleRefs[item.id] && RNAnimated.spring(scaleRefs[item.id], { toValue: 1, useNativeDriver: true }).start()
                      } catch {}
                    }}
                    onPress={() => {
                      const interestRefId = item?.ref || item?.id
                      if (!interestRefId) return
                      const title = item?.expand?.ref?.title || item?.title || ''
                      const isSubscribed = subscriptions.has(interestRefId)
                      openReferencers(item, {
                        type: 'community',
                        refId: interestRefId,
                        title,
                        isSubscribed,
                        onAdd: isSubscribed
                          ? undefined
                          : () => toggleSubscription(item, { forceSubscribe: true }),
                      })
                    }}
                    style={{
                      backgroundColor: c.surface,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: '#B0B0B0',
                      borderRadius: 12,
                      paddingVertical: 15,
                      paddingHorizontal: s.$1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <Text style={{ color: c.prompt, fontSize: s.$09, fontFamily: 'System', fontWeight: '400', paddingVertical: 3 }} numberOfLines={2}>
                      {item?.expand?.ref?.title || item?.title || ''}
                    </Text>
                    {contentTab !== 'mine' && null}
                    {/* Count bottom-right (only once count >= 3) */}
                    {count >= 3 && (
                      <Text style={{ position: 'absolute', right: 12, bottom: 8, color: c.prompt, opacity: 0.5, fontSize: (s.$09 as number) - 3 }}>
                        {`${count} people`}
                      </Text>
                    )}
                  </RNPressable>
                  </RNAnimated.View>
                    {isSubscribed ? (
                    <Pressable onPress={() => {
                      const isOwner = item?.expand?.ref?.creator === user?.id
                      if (isOwner) {
                        // delete the interest entirely
                        const refToDelete = item.ref || item.id
                        if (refToDelete) {
                          void pocketbase
                            .collection('refs')
                            .delete(refToDelete)
                            .catch((error) => {
                              console.warn('Failed to delete community ref', error)
                            })
                        }
                      } else {
                        toggleSubscription(item)
                      }
                    }} hitSlop={8} style={{ position: 'absolute', top: -2, right: 0, zIndex: 5 }}>
                      <View style={{ backgroundColor: (item?.expand?.ref?.creator === user?.id) ? '#D9534F' : c.grey1, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: c.surface, fontWeight: '700', fontSize: (s.$09 as number) - 2 }}>-</Text>
                      </View>
                    </Pressable>
                    ) : (
                      showNewBadge && (
                      <View style={{ position: 'absolute', top: -2, right: 0, backgroundColor: c.accent, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4, zIndex: 4 }}>
                        <Text style={{ color: c.surface, fontSize: (s.$09 as number) - 2, fontWeight: '700' }}>New</Text>
                      </View>
                    )
                  )}
                </Animated.View>
              )
            }}
          />
        </Animated.View>

        {filterTab !== 'people' && contentTab !== 'mine' && (
          <Animated.View
            style={[frontStyle, { position: 'absolute', top: 17, right: -8, zIndex: 6 }]}
          >
            <OvalJaggedAddButton onPress={openAddInterestSheet} />
          </Animated.View>
        )}

        {/* BACK: People/Directory placeholder */}
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, backStyle]} pointerEvents={filterTab === 'people' ? 'auto' as any : 'none' as any}>
          <View style={{ flex: 1, paddingLeft: PEOPLE_LEFT_INSET }}>
            <DirectoryScreen
              showHeader={false}
              hideInterestChips={true}
              embedded={true}
              aboveListComponent={<PeopleTabs showSearchButton={filterTab === 'people'} />}
            />
          </View>
          {filterTab === 'people' && (
            <View
              pointerEvents="box-none"
              style={{ position: 'absolute', top: PEOPLE_SEARCH_BUTTON_TOP, right: PEOPLE_SEARCH_BUTTON_RIGHT_OFFSET, zIndex: 12 }}
            >
              <View pointerEvents="auto">
                <OvalJaggedAddButton label="Search" textOffsetX={-1} onPress={() => {}} />
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      {/* Add sheet */}
      <CommunityFormSheet
        bottomSheetRef={communityFormRef}
        onAdded={(item) => {
          const promptLike = {
            id: item.ref,
            ref: item.ref,
            image: '',
            text: '',
            url: '',
            list: false,
            backlog: false,
            created: item.expand?.ref?.created || item.created,
            updated: item.expand?.ref?.updated || item.updated,
            expand: { ref: { ...(item.expand?.ref || {}), image: '' } },
            __promptKind: 'interest',
          } as any
          setCommunityItems((prev) => {
            if (prev.some((x) => x.id === promptLike.id)) return prev
            const next = [promptLike, ...prev]
            next.sort((a, b) => (b.created || '').localeCompare(a.created || ''))
            setNewlyAddedId(promptLike.id)
            if (contentTab === 'mine') {
              const subs = new Set(Array.from(subscriptions.keys()))
              const mine = next.filter((it) => subs.has(it.ref || it.id))
              setFilteredItems(mine)
            } else {
              const subs = new Set(Array.from(subscriptions.keys()))
              const rest = next.filter((it) => !subs.has(it.ref || it.id))
              setFilteredItems(rest)
            }
            return next
          })

          // Auto-subscribe the creator to their new interest
          try {
            if (user?.id) {
              const key = `community_subs:${user.id}:edge-patagonia`
              setSubscriptions((prev) => {
                const updated = new Map(prev)
                updated.set(promptLike.ref, true)
                // persist locally
                try { AsyncStorage.setItem(key, JSON.stringify(Array.from(updated.keys()))) } catch {}
                // best-effort remote
                try {
                  const sb: any = (supabase as any).client
                  if (sb) {
                    sb.from('community_subscriptions').upsert({ user_id: user.id, ref_id: promptLike.ref, community: 'edge-patagonia' }, { onConflict: 'user_id,ref_id' })
                  }
                } catch {}
                return updated
              })
            }
          } catch {}

          // Notify directories screen to add a chip immediately
          try {
            const event = new CustomEvent('refs:new-interest', { detail: { id: item.ref, title: item.expand?.ref?.title || '', created: item.created } })
            // @ts-ignore
            globalThis.dispatchEvent?.(event)
          } catch {}
        }}
      />

      {/* Added pill notification */}
      {justAddedTitle && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(250)}>
          <Pressable
            onPress={() => {
              const isAdded = justAddedTitle.startsWith('added ')
              if (isAdded && lastPillRefId) {
                try {
                  setCurrentRefId(lastPillRefId)
                  setReferencersContext(null)
                } catch {}
                try { referencersBottomSheetRef.current?.expand() } catch {}
              }
            }}
            style={{ position: 'absolute', bottom: 40, left: 20, right: 20, alignItems: 'center' }}
          >
            <View style={{ backgroundColor: c.grey1, borderRadius: 50, paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ color: c.surface }}>
                {justAddedTitle}
                {justAddedTitle.startsWith('added ') ? '  See Everyone →' : ''}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}

 
