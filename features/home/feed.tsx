import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ActivityIndicator, Dimensions, FlatList, View } from 'react-native'
import { router } from 'expo-router'

import { FeedRow } from '@/features/feed/FeedRow'
import { Ticker } from '@/features/home/Ticker'
import { useAppStore } from '@/features/stores'
import type { FeedEntry } from '@/features/stores/feed'
import { c, s } from '@/features/style'
import { Button, DismissKeyboard } from '@/ui'
import SearchBottomSheet from '@/ui/actions/SearchBottomSheet'

const win = Dimensions.get('window')

export const Feed = () => {
  const feedEntries = useAppStore((state) => state.feedEntries)
  const feedRefreshTrigger = useAppStore((state) => state.feedRefreshTrigger)
  const ensureFeedHydrated = useAppStore((state) => state.ensureFeedHydrated)
  const refreshFeed = useAppStore((state) => state.refreshFeed)
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
  const logout = useAppStore((state) => state.logout)
  const enableFeedNetwork = useAppStore((state) => state.enableFeedNetwork)

  const hydrationAttemptedRef = useRef(false)

  useEffect(() => {
    enableFeedNetwork()
  }, [enableFeedNetwork])

  useEffect(() => {
    if (feedHydrated) {
      return
    }
    if (hydrationAttemptedRef.current) {
      return
    }
    hydrationAttemptedRef.current = true

    const timeout = setTimeout(() => {
      console.log('[boot-trace] feed.component:ensureFeedHydrated')
      ensureFeedHydrated({ refresh: false })
        .catch((error: unknown) => {
          console.warn('Feed hydration failed', error)
        })
    }, 0)

    return () => clearTimeout(timeout)
  }, [ensureFeedHydrated, feedHydrated])

  useEffect(() => {
    if (!feedHydrated) {
      hydrationAttemptedRef.current = false
    }
  }, [feedHydrated])

  useEffect(() => {
    if (feedRefreshTrigger > 0) {
      refreshFeed({ force: true })
        .catch((error: unknown) => {
          console.warn('Feed refresh failed', error)
        })
    }
  }, [feedRefreshTrigger, refreshFeed])

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
          console.warn('Feed prefetch failed', error)
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

  const handleEndReached = useCallback(() => {
    if (!feedHasMore || feedLoadingMore) {
      return
    }
    fetchMoreFeed()
      .catch((error: unknown) => {
        console.warn('Feed load more failed', error)
      })
  }, [feedHasMore, feedLoadingMore, fetchMoreFeed])

  const renderItem = useCallback(
    ({ item }: { item: FeedEntry }) => (
      <View style={{ width: win.width - 20, alignSelf: 'center' }}>
        <FeedRow
          entry={item}
          onPressRef={handleRefPress}
          onPressImage={handleImagePress}
          onPressActor={handleActorPress}
        />
      </View>
    ),
    [handleActorPress, handleImagePress, handleRefPress]
  )

  const keyExtractor = useCallback((item: FeedEntry) => item.id, [])

  const listFooter = useMemo(() => {
    return (
      <View style={{ paddingVertical: s.$4, alignItems: 'center' }}>
        {feedLoadingMore && (
          <ActivityIndicator style={{ marginBottom: s.$2 }} color={c.muted} />
        )}
        <Button
          style={{ width: 120 }}
          variant="inlineSmallMuted"
          title="Log out"
          onPress={logout}
        />
      </View>
    )
  }, [feedLoadingMore, logout])

  return (
    <>
      <DismissKeyboard>
        <FlatList
          data={feedEntries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshing={feedRefreshing}
          onRefresh={() => {
            refreshFeed({ force: true })
              .catch((error: unknown) => {
                console.warn('Feed refresh failed', error)
              })
          }}
          onEndReachedThreshold={0.6}
          onEndReached={handleEndReached}
          contentContainerStyle={{
            paddingTop: s.$1,
            paddingHorizontal: s.$1half,
            paddingBottom: s.$6,
          }}
          ListFooterComponent={listFooter}
          showsVerticalScrollIndicator={false}
        />
      </DismissKeyboard>
      {feedEntries.length > 0 && <Ticker />}
      <SearchBottomSheet />
    </>
  )
}
