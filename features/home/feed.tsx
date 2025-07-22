import { Link } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Dimensions, Pressable, ScrollView, View } from 'react-native'

import { Ticker } from '@/features/home/Ticker'
import { pocketbase, useItemStore } from '@/features/pocketbase'
import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { DismissKeyboard, Heading, Text, XStack, YStack } from '@/ui'
import SearchBottomSheet from '@/ui/actions/SearchBottomSheet'
import { Avatar } from '@/ui/atoms/Avatar'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { ProfileDetailsSheet } from '@/ui/profiles/ProfileDetailsSheet'
import { useUIStore } from '@/ui/state'
import BottomSheet from '@gorhom/bottom-sheet'
import { getPreloadedData } from '@/features/pocketbase/background-preloader'
import { performanceMonitor } from '@/features/pocketbase/performance-monitor'

const win = Dimensions.get('window')

// Needed to compensate for differences between paragraph padding vs image padding.
const COMPENSATE_PADDING = 5
const FEED_PREVIEW_IMAGE_SIZE = 42
const FEED_REF_IMAGE_SIZE = Math.round(FEED_PREVIEW_IMAGE_SIZE * 1.33)

const formatDate = (isoDateString: string): string => {
  const date = new Date(isoDateString)
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)

  // Use built-in relative time formatter for recent items
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      if (diffInMinutes < 1) return 'now'
      return rtf.format(-diffInMinutes, 'minute')
    }
    return rtf.format(-diffInHours, 'hour')
  }

  // Show relative days for up to 7 days
  if (diffInDays <= 7) {
    return rtf.format(-diffInDays, 'day')
  }

  // Use built-in date formatter for older items
  const dtf = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })

  return dtf.format(date)
}

const ListItem = ({
  item,
  onTitlePress,
  onImagePress,
}: {
  item: ExpandedItem
  onTitlePress: () => void
  onImagePress: () => void
}) => {
  const creator = item.expand!.creator
  const creatorProfileUrl = `/user/${creator.userName}/` as const

  return (
    <View
      style={{
        backgroundColor: c.surface2,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 10,
        width: win.width - 20,
        alignSelf: 'center',
        marginBottom: 6,
      }}
    >
      <XStack
        key={item.id}
        gap={s.$08}
        style={{
          alignItems: 'center',
          width: '100%',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
        }}
      >
        {item.expand?.creator && (
          <Link href={creatorProfileUrl}>
            <View style={{}}>
              <Avatar source={creator.image} size={FEED_PREVIEW_IMAGE_SIZE} />
            </View>
          </Link>
        )}
        <View style={{ overflow: 'hidden', flex: 1 }}>
          <Text style={{ fontSize: 16 }}>
            <Link href={creatorProfileUrl}>
              <Heading tag="semistrong">{item.expand?.creator?.firstName || 'Anonymous'} </Heading>
            </Link>
            <Text style={{ color: c.muted2 }}>added </Text>
            <Heading tag="semistrong" onPress={onTitlePress}>
              {item.expand?.ref?.title}
            </Heading>
          </Text>
          <Text style={{ fontSize: 12, color: c.muted, paddingTop: 2 }}>
            {formatDate(item.created)}
          </Text>
        </View>

        {item?.image ? (
          <Pressable onPress={onImagePress}>
            <View
              style={{
                minWidth: FEED_REF_IMAGE_SIZE,
                minHeight: FEED_REF_IMAGE_SIZE,
              }}
            >
              <SimplePinataImage
                originalSource={item.image}
                imageOptions={{ width: FEED_REF_IMAGE_SIZE, height: FEED_REF_IMAGE_SIZE }}
                style={{
                  width: FEED_REF_IMAGE_SIZE,
                  height: FEED_REF_IMAGE_SIZE,
                  backgroundColor: c.accent,
                  borderRadius: s.$075,
                  top: 2,
                }}
              />
            </View>
          </Pressable>
        ) : (
          <View
            style={{
              width: FEED_REF_IMAGE_SIZE,
              height: FEED_REF_IMAGE_SIZE,
              backgroundColor: c.accent,
              borderRadius: s.$075,
            }}
          />
        )}
      </XStack>
    </View>
  )
}

export const Feed = () => {
  const [items, setItems] = useState<ExpandedItem[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreItems, setHasMoreItems] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const feedRefreshTrigger = useItemStore((state) => state.feedRefreshTrigger)
  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const { referencersBottomSheetRef, setCurrentRefId } = useUIStore()

  const fetchFeedItems = async (page: number = 1, append: boolean = false) => {
    if (page === 1) {
      performanceMonitor.startTimer('feed_load')
    }
    
    // Check for preloaded feed data first (only for first page)
    if (page === 1) {
      const cacheKey = `feed-data-${feedRefreshTrigger}`
      const preloadedFeed = getPreloadedData(cacheKey)
      
      if (preloadedFeed) {
        console.log('🚀 Using preloaded feed data')
        setItems(preloadedFeed)
        setCurrentPage(1)
        setHasMoreItems(true)
        performanceMonitor.endTimer('feed_load', true)
        return
      }
    }
    
    try {
      const records = await pocketbase.collection('items').getList<ExpandedItem>(page, 10, {
        // TODO: remove list = false once we have a way to display lists in the feed
        // also consider showing backlog items in the feed, when we have a way to link to them
        filter: `creator != null && backlog = false && list = false && parent = null`,
        sort: '-created',
        expand: 'ref,creator',
      })
      
      if (append) {
        setItems(prev => [...prev, ...records.items])
      } else {
      setItems(records.items)
      }
      
      setCurrentPage(page)
      setHasMoreItems(records.items.length === 10)
      
      if (page === 1) {
        performanceMonitor.endTimer('feed_load', false)
      }
    } catch (error) {
      console.error('Error fetching feed items:', error)
      if (page === 1) {
        performanceMonitor.endTimer('feed_load', false)
      }
    }
  }

  const loadMoreItems = async () => {
    if (isLoadingMore || !hasMoreItems) return
    
    setIsLoadingMore(true)
    try {
      await fetchFeedItems(currentPage + 1, true)
    } finally {
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchFeedItems(1, false)
  }, [feedRefreshTrigger]) // Refetch whenever the trigger changes

  return (
    <>
      <DismissKeyboard>
        <ScrollView
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
            const paddingToBottom = 20
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
              contentSize.height - paddingToBottom
            
            if (isCloseToBottom && hasMoreItems && !isLoadingMore) {
              loadMoreItems()
            }
          }}
          scrollEventThrottle={400}
        >
          <View style={{ height: '100%' }}>
            <View
              style={{
                paddingTop: s.$1,
                paddingHorizontal: s.$1half,
                width: win.width,
                display: 'flex',
                gap: s.$0,
              }}
            >
              <YStack
                gap={0}
                style={{
                  flex: 1,
                  paddingBottom: s.$12,
                }}
              >
                {items.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    onImagePress={() => {
                      // set the current item
                      setDetailsItem(item)
                      // open the details sheet
                      detailsSheetRef.current?.snapToIndex(0)
                    }}
                    onTitlePress={() => {
                      setCurrentRefId(item.ref)
                      referencersBottomSheetRef.current?.expand()
                    }}
                  />
                ))}
                {isLoadingMore && (
                  <View style={{ padding: s.$2, alignItems: 'center' }}>
                    <Text style={{ color: c.muted }}>Loading more...</Text>
                  </View>
                )}
              </YStack>
            </View>
          </View>
        </ScrollView>
      </DismissKeyboard>
      {items.length > 0 && <Ticker />}
      <SearchBottomSheet />
      {detailsItem && (
        <ProfileDetailsSheet
          detailsSheetRef={detailsSheetRef}
          profileUsername={detailsItem.expand!.creator.userName}
          detailsItemId={detailsItem.id}
          onChange={(index) => {
            // if the index is -1, then the user has closed the sheet
            if (index === -1) {
              setDetailsItem(null)
            }
          }}
          openedFromFeed={true}
        />
      )}
    </>
  )
}
