import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { View, Text, Dimensions, Pressable, FlatList, InteractionManager } from 'react-native'
import { s, c } from '@/features/style'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import { ensureCommunityChat, joinCommunityChat } from './communityChat'
import type { ReferencersContext } from '@/features/stores/types'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/features/supabase/client'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { Animated as RNAnimated, Pressable as RNPressable } from 'react-native'
import { OvalJaggedAddButton } from '@/ui/buttons/OvalJaggedAddButton'
import { Avatar } from '@/ui/atoms/Avatar'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { SearchLoadingSpinner } from '@/ui/atoms/SearchLoadingSpinner'
import { router } from 'expo-router'
import { Image } from 'expo-image'

const win = Dimensions.get('window')
const BADGE_OVERHANG = 8
const TICKER_COLOR = c.accent
const INTEREST_PILL_BORDER_COLOR = '#A5B89F'
const COMMUNITY_SLUG = 'edge-patagonia'
type CommunityCacheState = {
  items: any[]
  filtered: any[]
  contentTab: 'all' | 'mine'
  subscriptions: Array<[string, boolean]>
  subscriptionCounts: Array<[string, number]>
  memberAvatars: Array<[string, string[]]>
}

const communityCache: CommunityCacheState = {
  items: [],
  filtered: [],
  contentTab: 'all',
  subscriptions: [],
  subscriptionCounts: [],
  memberAvatars: [],
}

// Ensure each FlatList cell allows overflow so badges can overhang
const VisibleCell = (props: any) => {
  const { style, ...rest } = props as any
  return <View {...rest} style={[style, { overflow: 'visible' }]} />
}

export function EdgeCorkboardScreen() {
  const {
    user,
    setCurrentRefId,
    referencersBottomSheetRef,
    setReferencersContext,
    setConversationPreview,
    openCommunityFormSheet,
    removeInterestSheetRef,
    setPendingInterestRemoval,
    pendingInterestRemoval,
  } = useAppStore()
  const [communityItems, setCommunityItems] = useState<any[]>(() => communityCache.items)
  const [filteredItems, setFilteredItems] = useState<any[]>(() =>
    communityCache.filtered.length ? communityCache.filtered : communityCache.items
  )
  const [contentTab, setContentTab] = useState<'all' | 'mine'>(communityCache.contentTab)
  const [justAddedTitle, setJustAddedTitle] = useState<string | null>(null)
  const [subscriptionCounts, setSubscriptionCounts] = useState<Map<string, number>>(
    () => new Map(communityCache.subscriptionCounts)
  )
  const [memberAvatars, setMemberAvatars] = useState<Map<string, string[]>>(
    () => new Map(communityCache.memberAvatars)
  )
  const [rowWidths, setRowWidths] = useState<Record<string, number>>({})
  const [pendingChatSubscriptions, setPendingChatSubscriptions] = useState<
    Array<{ refId: string; title: string }>
  >([])
  // Subscriptions (local interim): map of refId -> true (persisted per-user via AsyncStorage)
  const [subscriptions, setSubscriptions] = useState<Map<string, boolean>>(
    () => new Map(communityCache.subscriptions)
  )
  const [lastPillRefId, setLastPillRefId] = useState<string | null>(null)
  // Simple scale refs for press feedback per-item
  const scaleRefs = useRef<Record<string, any>>({}).current
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null)

  useEffect(() => {
    communityCache.items = communityItems
  }, [communityItems])

  useEffect(() => {
    communityCache.filtered = filteredItems
  }, [filteredItems])

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
    communityCache.memberAvatars = Array.from(memberAvatars.entries())
  }, [memberAvatars])


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
        const [refs, countRows, memberRows] = await Promise.all([
          pocketbase.collection('refs').getFullList({
            filter: pocketbase.filter('meta ~ {:community}', { community: COMMUNITY }),
            sort: '-created',
            expand: 'creator',
          }),
          sb
            ? sb
                .from('community_subscriptions')
                .select('ref_id')
                .eq('community', COMMUNITY)
            : Promise.resolve({ data: [] }),
          sb
            ? sb
                .from('community_subscriptions')
                .select('ref_id, user:user_id(image, avatar_url)')
                .eq('community', COMMUNITY)
                .order('created', { ascending: true })
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

        // Build member avatars map - start with creator, then add subscribers
        const avatarsMap = new Map<string, string[]>()
        
        // First, add creator avatars
        for (const ref of refs) {
          const refId = ref.id
          const creatorAvatar = (ref as any).expand?.creator?.image || (ref as any).expand?.creator?.avatar_url
          if (creatorAvatar) {
            avatarsMap.set(refId, [creatorAvatar])
          }
        }
        
        // Then add subscriber avatars (up to 3 total)
        const memberData = (memberRows as any)?.data || []
        for (const row of memberData) {
          const refId = row.ref_id
          const avatarUrl = row.user?.image || row.user?.avatar_url
          if (avatarUrl) {
            const existing = avatarsMap.get(refId) || []
            // Don't add duplicates and keep limit at 3
            if (existing.length < 3 && !existing.includes(avatarUrl)) {
              avatarsMap.set(refId, [...existing, avatarUrl])
            }
          }
        }
        setMemberAvatars(avatarsMap)

        const mapped = refs.map(mapRefToItem)
        setCommunityItems(mapped)
        setFilteredItems(mapped)

        if (pendingChatSubscriptions.length) {
          pendingChatSubscriptions.forEach(({ refId, title }) => {
            ensureCommunityChat(refId, { title })
              .then(({ conversationId }) => joinCommunityChat(conversationId, user?.id || ''))
              .catch((error) => console.warn('Failed to sync pending chat', error))
          })
          setPendingChatSubscriptions([])
        }
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
    (tab: 'all' | 'mine', subs: Map<string, boolean>, items: any[]): any[] => {
      if (tab === 'mine') {
        return items.filter((it) => subs.has(it.ref || it.id))
      }
      return items
    },
    []
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
        AsyncStorage.setItem(key, JSON.stringify(arr))
          .then(() => console.log('✅ Subscriptions saved locally:', arr.length, 'interests'))
          .catch((error) => console.warn('Failed to save subscriptions locally:', error))

        ;(async () => {
          try {
            const sb: any = (supabase as any).client
            if (shouldSubscribe) {
              const { conversationId } = await ensureCommunityChat(refId, {
                title: item?.expand?.ref?.title || item?.title || 'Community chat',
              })
              await joinCommunityChat(conversationId, user.id)
              setConversationPreview(conversationId, null, 0)
              if (sb) {
                const result = await sb
                  .from('community_subscriptions')
                  .upsert({ user_id: user.id, ref_id: refId, community: 'edge-patagonia' }, { onConflict: 'user_id,ref_id' })
                if (result.error) {
                  // Supabase sync is best-effort; local storage is source of truth
                  if (__DEV__) console.log('Supabase subscription sync skipped:', result.error.message)
                } else {
                  if (__DEV__) console.log('✅ Subscription synced to Supabase for ref:', refId)
                }
              }
            } else {
              if (sb) {
                const result = await sb
                  .from('community_subscriptions')
                  .delete()
                  .match({ user_id: user.id, ref_id: refId })
                if (result.error) {
                  console.warn('Failed to delete subscription from Supabase:', result.error)
                } else {
                  console.log('✅ Subscription removed from Supabase for ref:', refId)
                }
              }
            }
          } catch (error) {
            console.warn('toggleSubscription community chat sync failed', error)
          }
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

        // Update member avatars optimistically
        if (shouldSubscribe && user?.image) {
          setMemberAvatars((prevAvatars) => {
            const nextAvatars = new Map(prevAvatars)
            const current = nextAvatars.get(refId) || []
            if (current.length < 3 && !current.includes(user.image!)) {
              nextAvatars.set(refId, [...current, user.image!])
            }
            return nextAvatars
          })
        }

        return next
      })
    },
    [user?.id, user?.image, contentTab, communityItems, computeFilteredItems]
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

  // Handle confirmed removal of interest
  const handleConfirmRemoval = useCallback(() => {
    if (!pendingInterestRemoval) return
    const { item, isOwner } = pendingInterestRemoval

    if (isOwner) {
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

    setPendingInterestRemoval(null)
  }, [pendingInterestRemoval, toggleSubscription, setPendingInterestRemoval])

  // Filter tabs were previously used to flip to the directory view. With the directory now living
  // on its own screen we only display a static label for context.
  const FilterTabs = () => (
    <View style={{ paddingLeft: s.$1 + 6, paddingRight: s.$1 + 6, marginTop: -8, marginBottom: 4 }}>
      <Text style={{ color: c.newDark, fontSize: 14, fontWeight: '400', opacity: 0.7 }}>
        The corkboard is full of community-specific group chats. Start one for anything.
      </Text>
    </View>
  )

  // Plain text tabs above the list: All | New | Mine
  const PlainTabs = () => {
    const tabs: { key: 'all' | 'mine'; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'mine', label: 'Mine' },
    ]

    return (
      <View style={{ flexDirection: 'row', gap: 8, paddingTop: 9, marginBottom: 12 }}>
        {tabs.map((t) => {
          const active = contentTab === t.key
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                setContentTab(t.key)
                setFilteredItems(computeFilteredItems(t.key, subscriptions, communityItems))
              }}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: TICKER_COLOR,
                  backgroundColor: active ? TICKER_COLOR : 'transparent',
                opacity: active ? 1 : 0.5,
                }}
            >
              <Text
                style={{
                  fontSize: (s.$09 as number) - 3,
                  fontWeight: '700',
                  color: active ? c.surface : TICKER_COLOR,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {/* Header + upper ticker (front only) */}
      <View>
        {/* Header */}
        <View style={{ paddingHorizontal: s.$1 + 6, paddingTop: s.$1 + 6 }}>
          <Text style={{ color: c.newDark, fontSize: (s.$09 as number) + 6, fontFamily: 'InterBold', fontWeight: '700', marginBottom: 4 }}>
            Edge Corkboard
          </Text>
          <View style={{ height: (s.$05 as number) + 8 }} />
        </View>

        {/* Filter ticker */}
        <FilterTabs />
      </View>

      <View style={{ flex: 1, paddingHorizontal: s.$1 + 6, paddingTop: 6, position: 'relative' }}>
        <PlainTabs />
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
          renderItem={({ item }) => {
            const refId = item?.ref || item?.id
            const count = subscriptionCounts.get(refId) || 0
            const isSubscribed = subscriptions.has(refId)
            const emphasized = count <= 2
            const showNewBadge = !isSubscribed && contentTab !== 'mine' && emphasized
            const avatars = memberAvatars.get(refId) || []
            return (
              <Animated.View
                style={{ position: 'relative', marginBottom: (s.$075 as number) + 2, paddingRight: BADGE_OVERHANG + 2 }}
                onLayout={(e) => {
                  try {
                    const w = e.nativeEvent.layout.width
                    if (w && rowWidths[item.id] !== w) {
                      setRowWidths((prev) => ({ ...prev, [item.id]: w }))
                    }
                  } catch {}
                }}
              >
                <RNAnimated.View style={{ transform: [{ scale: scaleRefs[item.id] || 1 }] }}>
                  <RNPressable
                    onPressIn={() => {
                      try {
                        ;(scaleRefs[item.id] || (scaleRefs[item.id] = new RNAnimated.Value(1))) &&
                          RNAnimated.spring(scaleRefs[item.id], { toValue: 0.96, useNativeDriver: true }).start()
                      } catch {}
                    }}
                    onPressOut={() => {
                      try {
                        scaleRefs[item.id] &&
                          RNAnimated.spring(scaleRefs[item.id], { toValue: 1, useNativeDriver: true }).start()
                      } catch {}
                    }}
                    onPress={() => {
                      const interestRefId = item?.ref || item?.id
                      if (!interestRefId) return
                      const title = item?.expand?.ref?.title || item?.title || ''
                      const subscribed = subscriptions.has(interestRefId)
                      openReferencers(item, {
                        type: 'community',
                        refId: interestRefId,
                        title,
                        isSubscribed: subscribed,
                        onAdd: subscribed ? undefined : () => toggleSubscription(item, { forceSubscribe: true }),
                      })
                    }}
                    style={{
                      backgroundColor: c.surface2,
                      borderRadius: 17,
                      paddingVertical: 22,
                      paddingHorizontal: s.$1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: avatars.length > 0 ? 50 : 0 }}>
                      <Text
                        style={{
                          color: c.muted,
                          fontSize: 18,
                          fontFamily: 'InterMedium',
                          fontWeight: '600',
                          paddingVertical: 3,
                        }}
                        numberOfLines={2}
                      >
                        {item?.expand?.ref?.title || item?.title || ''}
                      </Text>
                    </View>
                    {avatars.length > 0 && (
                      <View
                        style={{
                          position: 'absolute',
                          right: 12,
                          bottom: 8,
                          flexDirection: 'row',
                        }}
                      >
                        {(() => {
                          const displayAvatars = count > 3 ? avatars.slice(0, 2) : avatars
                          const remaining = count > 3 ? count - 2 : 0
                          
                          return (
                            <>
                              {displayAvatars.map((avatarUrl, idx) => (
                                <View
                                  key={`${refId}-${idx}`}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    marginLeft: idx > 0 ? -8 : 0,
                                    borderWidth: 2,
                                    borderColor: c.surface2,
                                    overflow: 'hidden',
                                    backgroundColor: c.surface,
                                  }}
                                >
                                  <Image
                                    source={avatarUrl}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                    transition={0}
                                    cachePolicy="memory-disk"
                                  />
                                </View>
                              ))}
                              {remaining > 0 && (
                                <View
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    marginLeft: -8,
                                    borderWidth: 2,
                                    borderColor: c.surface2,
                                    backgroundColor: c.muted,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: c.surface,
                                      fontSize: 10,
                                      fontWeight: '700',
                                    }}
                                  >
                                    +{remaining}
                                  </Text>
                                </View>
                              )}
                            </>
                          )
                        })()}
                      </View>
                    )}
                  </RNPressable>
                </RNAnimated.View>
                {isSubscribed ? (
                  <Pressable
                    onPress={() => {
                      const isOwner = item?.expand?.ref?.creator === user?.id
                      const title = item?.expand?.ref?.title || item?.title || ''
                      setPendingInterestRemoval({
                        item,
                        isOwner,
                        title,
                        onConfirm: () => handleConfirmRemoval(),
                      })
                      removeInterestSheetRef.current?.expand()
                    }}
                    hitSlop={8}
                    style={{ position: 'absolute', top: -5, right: 1, zIndex: 5 }}
                  >
                    <View style={{ backgroundColor: item?.expand?.ref?.creator === user?.id ? '#D9534F' : c.grey1, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: c.surface, fontWeight: '700', fontSize: (s.$09 as number) - 2, transform: [{ scale: 1.3 }] }}>-</Text>
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

        {contentTab !== 'mine' && (
          <View style={{ position: 'absolute', top: 17, right: -8, zIndex: 6 }}>
            <OvalJaggedAddButton onPress={() => {
              openCommunityFormSheet((item) => {
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
                  title: (item as any).expand?.ref?.title || (item as any).title || '',
                } as any
                setCommunityItems((prev) => {
                  if (prev.some((x) => x.id === promptLike.id)) return prev
                  const next = [promptLike, ...prev]
                  next.sort((a, b) => (b.created || '').localeCompare(a.created || ''))
                  setNewlyAddedId(promptLike.id)
                  setFilteredItems(computeFilteredItems(contentTab, subscriptions, next))
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
                      // best-effort remote (await for better reliability)
                      ;(async () => {
                        try {
                          const sb: any = (supabase as any).client
                          if (sb) {
                            const result = await sb.from('community_subscriptions').upsert({ 
                              user_id: user.id, 
                              ref_id: promptLike.ref, 
                              community: 'edge-patagonia' 
                            }, { onConflict: 'user_id,ref_id' })
                            if (result.error) {
                              console.warn('Failed to save subscription to Supabase:', result.error)
                            } else {
                              console.log('✅ Subscription saved to Supabase for ref:', promptLike.ref)
                            }
                          }
                        } catch (error) {
                          console.warn('Failed to save subscription:', error)
                        }
                      })()
                      return updated
                    })

                    setSubscriptionCounts((prevCounts) => {
                      const next = new Map(prevCounts)
                      next.set(promptLike.ref, (next.get(promptLike.ref) || 0) + 1)
                      return next
                    })

                    // Use InteractionManager to defer navigation until after sheet closes
                    // This prevents "rendered fewer hooks than expected" error
                    InteractionManager.runAfterInteractions(async () => {
                      try {
                        const { conversationId } = await ensureCommunityChat(promptLike.ref, {
                          title: promptLike.expand?.ref?.title || promptLike.title || 'Community chat',
                        })
                        await joinCommunityChat(conversationId, user.id)
                        router.push(`/messages/${conversationId}`)
                      } catch (error) {
                        console.warn('Failed to open chat after creating interest', error)
                      }
                    })
                  }
                } catch {}

                // Notify directories screen to add a chip immediately
                try {
                  const event = new CustomEvent('refs:new-interest', { detail: { id: item.ref, title: item.expand?.ref?.title || '', created: item.created } })
                  // @ts-ignore
                  globalThis.dispatchEvent?.(event)
                } catch {}
              })
            }} />
          </View>
        )}
      </View>

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

 
