import { Link } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Dimensions, Pressable, ScrollView, View } from 'react-native'

import { Ticker } from '@/features/home/Ticker'
import { useAppStore } from '@/features/stores'
import type { ExpandedItem } from '@/features/types'
import { c, s } from '@/features/style'
import { DismissKeyboard, Heading, Text, XStack, YStack } from '@/ui'
import SearchBottomSheet from '@/ui/actions/SearchBottomSheet'
import { Avatar } from '@/ui/atoms/Avatar'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { ProfileDetailsSheet } from '@/ui/profiles/ProfileDetailsSheet'
import BottomSheet from '@gorhom/bottom-sheet'

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
  const feedRefreshTrigger = useAppStore((state) => state.feedRefreshTrigger)
  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const { getFeedItems, referencersBottomSheetRef, setCurrentRefId } = useAppStore()

  const fetchFeedItems = async () => {
    try {
      const items = await getFeedItems()
      setItems(items)
    } catch (error) {
      console.error('Error fetching feed items:', error)
    }
  }

  useEffect(() => {
    fetchFeedItems()
  }, [feedRefreshTrigger]) // Refetch whenever the trigger changes

  return (
    <>
      <DismissKeyboard>
        <ScrollView>
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
