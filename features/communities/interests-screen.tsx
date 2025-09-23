import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, Text, Dimensions, Pressable, FlatList, ScrollView } from 'react-native'
import { s, c } from '@/features/style'
import { pocketbase } from '@/features/pocketbase'
import BottomSheet from '@gorhom/bottom-sheet'
import { CommunityFormSheet } from '@/ui/communities/CommunityFormSheet'
import { useAppStore } from '@/features/stores'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/features/supabase/client'
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming, interpolate, Extrapolation } from 'react-native-reanimated'
import { Animated as RNAnimated, Pressable as RNPressable } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { CommunitiesFeedScreen as DirectoryScreen } from '@/features/communities/feed-screen'
import { OvalJaggedAddButton } from '@/ui/buttons/OvalJaggedAddButton'

const win = Dimensions.get('window')
const BADGE_OVERHANG = 8
const PEOPLE_BUTTON_TOP = -5
const PEOPLE_BUTTON_RIGHT = -5
const PEOPLE_TABS_GAP_TO_BUTTON = 20
const PEOPLE_TABS_FADE_WIDTH = 88

// Ensure each FlatList cell allows overflow so badges can overhang
const VisibleCell = (props: any) => {
  const { style, ...rest } = props as any
  return <View {...rest} style={[style, { overflow: 'visible' }]} />
}

export function CommunityInterestsScreen() {
  const [communityItems, setCommunityItems] = useState<any[]>([])
  const [filteredItems, setFilteredItems] = useState<any[]>([])
  const [filterTab, setFilterTab] = useState<'popular' | 'people' | null>('popular')
  const [contentTab, setContentTab] = useState<'all' | 'new' | 'mine'>('all')
  const [justAddedTitle, setJustAddedTitle] = useState<string | null>(null)
  const [subscriptionCounts, setSubscriptionCounts] = useState<Map<string, number>>(new Map())
  const [rowWidths, setRowWidths] = useState<Record<string, number>>({})
  const communityFormRef = useRef<BottomSheet>(null)
  const { user, setCurrentRefId, referencersBottomSheetRef } = useAppStore()
  // Subscriptions (local interim): map of refId -> true (persisted per-user via AsyncStorage)
  const [subscriptions, setSubscriptions] = useState<Map<string, boolean>>(new Map())
  const [lastPillRefId, setLastPillRefId] = useState<string | null>(null)
  const [peopleButtonWidth, setPeopleButtonWidth] = useState<number>(0)
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
    let mounted = true
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

        if (!mounted) return

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

    const handleEvent = (e: any) => {
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

    load()
    ;(async () => {
      try { unsub = await pocketbase.collection('refs').subscribe('*', handleEvent) } catch {}
    })()
    // Load current user's subscriptions (local-only for now)
    ;(async () => {
      try {
        if (!user?.id) return
        const key = `community_subs:${user.id}:edge-patagonia`
        // Prefer Supabase
        const sb: any = (supabase as any).client
        let data: any = null
        let error: any = null
        if (sb) {
          const resp = await sb
            .from('community_subscriptions')
            .select('ref_id')
            .eq('user_id', user.id)
            .eq('community', 'edge-patagonia')
          data = resp.data
          error = resp.error
        }
        let refIds: string[] | null = null
        if (!error && Array.isArray(data)) {
          refIds = data.map((r: any) => r.ref_id)
          // Cache locally
          await AsyncStorage.setItem(key, JSON.stringify(refIds))
        }
        // Fallback to local cache
        if (!refIds) {
          const raw = await AsyncStorage.getItem(key)
          if (raw) refIds = JSON.parse(raw)
        }
        if (!mounted) return
        if (Array.isArray(refIds)) {
          const map = new Map<string, boolean>()
          for (const id of refIds) map.set(id, true)
          setSubscriptions(map)
        }
      } catch (e) {
        console.warn('Subscriptions load failed:', e)
      }
    })()

    return () => { if (typeof unsub === 'function') try { unsub() } catch {}; mounted = false }
  }, [user?.id])

  // Keep filteredItems in sync with current data and filter selection
  useEffect(() => {
    const isMineView = contentTab === 'mine'
    if (isMineView) {
      const mine = communityItems.filter((it) => subscriptions.has(it.ref || it.id))
      setFilteredItems(mine)
    } else {
      let rest = communityItems.filter((it) => !subscriptions.has(it.ref || it.id))
      if (contentTab === 'new') {
        rest = rest.filter((it) => (subscriptionCounts.get(it.ref || it.id) || 0) <= 2)
      }
      setFilteredItems(rest)
    }
  }, [communityItems, filterTab, subscriptions, contentTab, subscriptionCounts])

  // Toggle subscription
  const toggleSubscription = useCallback(async (item: any) => {
    const refId = item?.ref || item?.id
    if (!refId || !user?.id) return
    const key = `community_subs:${user.id}:edge-patagonia`
    setSubscriptions((prev) => {
      const next = new Map(prev)
      if (next.has(refId)) {
        next.delete(refId)
        setJustAddedTitle(`unsubscribed ${item?.expand?.ref?.title || item?.title || ''}`)
      } else {
        next.set(refId, true)
        setJustAddedTitle(`added ${item?.expand?.ref?.title || item?.title || ''}`)
      }
      setLastPillRefId(refId)
      // Persist
      const arr = Array.from(next.keys())
      AsyncStorage.setItem(key, JSON.stringify(arr)).catch(() => {})
      // Try Supabase (best-effort; ignore failures)
      ;(async () => {
        try {
          const sb: any = (supabase as any).client
          if (!sb) return
          if (next.has(refId)) {
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
      // Recalculate filter if needed
      if (contentTab === 'mine') {
        const mine = communityItems.filter((it) => next.has(it.ref || it.id))
        setFilteredItems(mine)
      } else {
        const rest = communityItems.filter((it) => !next.has(it.ref || it.id))
        setFilteredItems(rest)
      }
      const isAdded = !prev.has(refId)
      const duration = isAdded ? 2500 : 1500
      setTimeout(() => setJustAddedTitle(null), duration)
      // Optimistically adjust counts
      setSubscriptionCounts((prevCounts) => {
        const nextCounts = new Map(prevCounts)
        const current = nextCounts.get(refId) || 0
        nextCounts.set(refId, Math.max(0, current + (isAdded ? 1 : -1)))
        return nextCounts
      })
      return next
    })
  }, [subscriptions, user?.id, contentTab, communityItems])

  // Open referencers sheet
  const openReferencers = useCallback((item: any) => {
    const refId = item?.ref || item?.id
    if (!refId) return
    try {
      setCurrentRefId(refId)
    } catch {}
    try { referencersBottomSheetRef.current?.expand() } catch {}
  }, [setCurrentRefId, referencersBottomSheetRef])

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
                const rest = communityItems.filter((it) => !subscriptions.has(it.ref || it.id))
                setFilteredItems(rest)
                setContentTab('all')
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
                if (t.key === 'mine') {
                  const mine = communityItems.filter((it) => subscriptions.has(it.ref || it.id))
                  setFilteredItems(mine)
                } else {
                  let rest = communityItems.filter((it) => !subscriptions.has(it.ref || it.id))
                  if (t.key === 'new') {
                    rest = rest.filter((it) => (subscriptionCounts.get(it.ref || it.id) || 0) <= 2)
                  }
                  setFilteredItems(rest)
                }
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
  const PeopleTabs = () => {
    const [activeTab, setActiveTab] = useState<string>('All')
    const tabs = ['All', 'bio', 'crypto', 'tennis', 'new cities']
    return (
      <View style={{ paddingTop: 28, marginBottom: 10 }}>
        <View style={{ position: 'relative', overflow: 'hidden' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
              <View style={{ width: peopleButtonWidth + PEOPLE_TABS_GAP_TO_BUTTON }} />
            </View>
          </ScrollView>
          <Svg
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, right: 0, height: '100%' }}
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
            renderItem={({ item, index }) => {
              const refId = item?.ref || item?.id
              const count = subscriptionCounts.get(refId) || 0
              const emphasized = count <= 2
              const isMineView = contentTab === 'mine'
              const showNewBadge = !isMineView && emphasized
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
                      if (isMineView) {
                        openReferencers(item)
                      } else {
                        toggleSubscription(item)
                      }
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
                    {isMineView ? (
                    <Pressable onPress={() => {
                      const isOwner = item?.expand?.ref?.creator === user?.id
                      if (isOwner) {
                        // delete the interest entirely
                        try { ;(async () => { await pocketbase.collection('refs').delete(item.ref || item.id) })() } catch {}
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

        {filterTab !== 'people' && (
          <Animated.View
            style={[frontStyle, { position: 'absolute', top: 12, right: -5, zIndex: 6 }]}
          >
            <OvalJaggedAddButton onPress={openAddInterestSheet} />
          </Animated.View>
        )}

        {/* BACK: People/Directory placeholder */}
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, backStyle]} pointerEvents={filterTab === 'people' ? 'auto' as any : 'none' as any}>
          <View style={{ flex: 1 }}>
            <DirectoryScreen showHeader={false} hideInterestChips={true} aboveListComponent={<PeopleTabs />} />
          </View>
          {filterTab === 'people' && (
            <View
              style={{ position: 'absolute', top: PEOPLE_BUTTON_TOP, right: PEOPLE_BUTTON_RIGHT, zIndex: 10 }}
              onLayout={(e) => {
                const width = e.nativeEvent.layout.width
                if (width && Math.abs(width - peopleButtonWidth) > 1) {
                  setPeopleButtonWidth(width)
                }
              }}
            >
              <OvalJaggedAddButton label="Search" textOffsetX={-1} onPress={() => {}} />
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
                try { setCurrentRefId(lastPillRefId) } catch {}
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

 
