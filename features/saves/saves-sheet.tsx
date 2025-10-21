import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet'

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
  const referencersBottomSheetRef = useAppStore((state) => state.referencersBottomSheetRef)
  const detailsSheetRef = useAppStore((state) => state.detailsSheetRef)
  const setCurrentRefId = useAppStore((state) => state.setCurrentRefId)
  const setDetailsSheetData = useAppStore((state) => state.setDetailsSheetData)

  const prefetchedOnceRef = useRef(false)

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

  const handleRefPress = useCallback(
    (entry: FeedEntry) => {
      if (!entry.ref?.id) return
      setCurrentRefId(entry.ref.id)
      referencersBottomSheetRef.current?.expand?.()
    },
    [referencersBottomSheetRef, setCurrentRefId]
  )

  const handleImagePress = useCallback(
    (entry: FeedEntry) => {
      if (entry.kind === 'ref_add' && entry.itemId) {
        setDetailsSheetData({
          itemId: entry.itemId,
          profileUsername: entry.actor.userName,
          openedFromFeed: true,
        })
        detailsSheetRef.current?.snapToIndex?.(0)
        return
      }
      handleRefPress(entry)
    },
    [detailsSheetRef, handleRefPress, setDetailsSheetData]
  )

  const handleActorPress = useCallback((entry: FeedEntry) => {
    if (!entry.actor.userName) return
    router.push(`/user/${entry.actor.userName}`)
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: FeedEntry }) => (
      <FeedRow
        entry={item}
        onPressRef={handleRefPress}
        onPressImage={handleImagePress}
        onPressActor={handleActorPress}
      />
    ),
    [handleActorPress, handleImagePress, handleRefPress]
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
        <View style={{ paddingVertical: s.$1, marginBottom: (s.$2 as number) - 10 }}>
          <Heading tag="h1" style={{ lineHeight: 30 }}>
            Feed
          </Heading>
          <Text style={{ fontSize: 15, color: c.muted2, marginTop: 2 }}>
            Everyone who's here.
          </Text>
        </View>
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
