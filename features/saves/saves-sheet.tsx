import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ActivityIndicator, InteractionManager, View } from 'react-native'
import { router } from 'expo-router'
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'

import { FeedRow } from '@/features/feed/FeedRow'
import { useAppStore } from '@/features/stores'
import type { FeedEntry } from '@/features/stores/feed'
import { c, s } from '@/features/style'
import { Heading, Text } from '@/ui'

export default function FeedSheet({
  savesBottomSheetRef,
}: {
  savesBottomSheetRef: React.RefObject<BottomSheet>
}) {
  const feedEntries = useAppStore((state) => state.feedEntries)
  const ensureFeedHydrated = useAppStore((state) => state.ensureFeedHydrated)
  const refreshFeed = useAppStore((state) => state.refreshFeed)
  const enableFeedNetwork = useAppStore((state) => state.enableFeedNetwork)
  const prefetchNextFeedPage = useAppStore((state) => state.prefetchNextFeedPage)
  const fetchMoreFeed = useAppStore((state) => state.fetchMoreFeed)
  const feedHasMore = useAppStore((state) => state.feedHasMore)
  const feedRefreshing = useAppStore((state) => state.feedRefreshing)
  const feedLoadingMore = useAppStore((state) => state.feedLoadingMore)
  const feedHydrated = useAppStore((state) => state.feedHydrated)

  const prefetchedOnceRef = useRef(false)
  const navInFlightRef = useRef(false)

  useEffect(() => {
    if (feedEntries.length === 0) {
      prefetchedOnceRef.current = false
      return
    }
    if (!prefetchedOnceRef.current && feedEntries.length > 0) {
      prefetchedOnceRef.current = true
      prefetchNextFeedPage()
        .catch((error: unknown) => {
          console.warn('Feed prefetch (sheet) failed', error)
        })
    }
  }, [feedEntries.length, prefetchNextFeedPage])

  const handleActorPress = useCallback(
    async (entry: FeedEntry) => {
      const userName = entry.actor.userName
      if (!userName || navInFlightRef.current) return
      navInFlightRef.current = true
      try {
        savesBottomSheetRef.current?.close?.()
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
        await new Promise((resolve) => InteractionManager.runAfterInteractions(() => resolve(null)))
        router.push(`/user/${userName}`)
      } finally {
        setTimeout(() => {
          navInFlightRef.current = false
        }, 150)
      }
    },
    [savesBottomSheetRef]
  )

  const renderItem = useCallback(
    ({ item, index }: { item: FeedEntry; index: number }) => (
      <View>
        <FeedRow entry={item} onPressRow={handleActorPress} />
        {index < feedEntries.length - 1 && (
          <View style={{ height: 1, backgroundColor: '#F0F0F0', marginLeft: 56 }} />
        )}
      </View>
    ),
    [handleActorPress, feedEntries.length]
  )

  const keyExtractor = useCallback((item: FeedEntry) => item.id, [])

  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  const handleEndReached = useCallback(() => {
    if (!feedHasMore || feedLoadingMore) {
      return
    }
    fetchMoreFeed()
      .catch((error: unknown) => {
        console.warn('Feed load more (sheet) failed', error)
      })
  }, [feedHasMore, feedLoadingMore, fetchMoreFeed])

  const listEmptyComponent = useMemo(() => {
    return (
      <View style={{ paddingVertical: s.$4, alignItems: 'center' }}>
        <Text style={{ color: c.muted, fontSize: 14 }}>No activity yet.</Text>
      </View>
    )
  }, [])

  const listFooterComponent = useMemo(() => {
    if (!feedLoadingMore) {
      return <View style={{ height: s.$3 }} />
    }
    return (
      <View style={{ paddingVertical: s.$3 }}>
        <ActivityIndicator color={c.muted} />
      </View>
    )
  }, [feedLoadingMore])

  return (
    <BottomSheet
      ref={savesBottomSheetRef}
      index={-1}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      snapPoints={['80%']}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: s.$4 }}
      handleIndicatorStyle={{ backgroundColor: 'transparent' }}
      onChange={(index) => {
        if (index === -1) {
          prefetchedOnceRef.current = false
          return
        }

        if (index >= 0) {
          enableFeedNetwork()
          refreshFeed({ force: true, silent: true })
            .catch((error: unknown) => {
              console.warn('Feed refresh (sheet) failed', error)
            })
        }
      }}
    >
      <View style={{ flex: 1, paddingHorizontal: s.$2, paddingBottom: s.$2 }}>
        <BottomSheetView style={{ paddingTop: s.$1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'flex-start' }}>
              <Heading tag="h1" style={{ lineHeight: 30 }}>
                Feed
              </Heading>
              <View style={{ height: 8 }} />
              <Text style={{ fontSize: 15, color: c.muted2 }}>
                Everyone who's here.
              </Text>
            </View>
            <View style={{ marginLeft: 16, width: 60, height: 60, borderRadius: 10, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="earth-outline" size={40} color={c.newDark} />
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#E0E0E0', marginTop: 16, marginBottom: 12 }} />
        </BottomSheetView>
        <BottomSheetFlatList
          data={feedEntries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: s.$4,
          }}
          onEndReachedThreshold={0.6}
          onEndReached={handleEndReached}
          refreshing={feedRefreshing}
          onRefresh={() => {
            refreshFeed({ force: true })
              .catch((error: unknown) => {
                console.warn('Feed refresh (sheet pull) failed', error)
              })
          }}
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={listFooterComponent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </BottomSheet>
  )
}
