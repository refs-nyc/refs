import { useState, useEffect } from 'react'
import { View, ScrollView, Dimensions } from 'react-native'
import { Link } from 'expo-router'

import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { pocketbase, useItemStore } from '@/features/pocketbase'
import { s, c } from '@/features/style'
import { DismissKeyboard, XStack, YStack, Heading, Button, Text } from '@/ui'
import SearchBottomSheet from '@/ui/actions/SearchBottomSheet'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { Avatar } from '@/ui/atoms/Avatar'

const win = Dimensions.get('window')

// Needed to compensate for differences between paragraph padding vs image padding.
const COMPENSATE_PADDING = 5
const FEED_PREVIEW_IMAGE_SIZE = 42

const ListItem = ({ item }: { item: ExpandedItem }) => {
  const creator = item.expand!.creator
  const creatorProfileUrl = `/user/${creator.userName}/` as const
  const itemUrl = `${creatorProfileUrl}modal?initialId=${item.id}&openedFromFeed=true` as const

  return (
    <XStack
      key={item.id}
      gap={s.$08}
      style={{
        paddingBottom: 1,
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
      }}
    >
      {item.expand?.creator && (
        <Link href={creatorProfileUrl}>
          <View style={{ paddingTop: COMPENSATE_PADDING }}>
            <Avatar source={creator.image} size={FEED_PREVIEW_IMAGE_SIZE} />
          </View>
        </Link>
      )}
      <View style={{ overflow: 'hidden', flex: 1 }}>
        <Text style={{ fontSize: 16 }}>
          <Link href={creatorProfileUrl}>
            <Heading tag="semistrong">{item.expand?.creator?.firstName || 'Anonymous'} </Heading>
          </Link>
          <Text style={{ color: c.muted2 }}>
            added{' '}
          </Text>
          <Link href={itemUrl}>
            <Heading tag="semistrong">{item.expand?.ref?.title}</Heading>
          </Link>
        </Text>
      </View>

      {item?.image ? (
        <Link href={itemUrl}>
          <View style={{ paddingTop: COMPENSATE_PADDING }}>
            <SimplePinataImage
              originalSource={item.image}
              imageOptions={{ width: FEED_PREVIEW_IMAGE_SIZE, height: FEED_PREVIEW_IMAGE_SIZE }}
              style={{
                width: FEED_PREVIEW_IMAGE_SIZE,
                height: FEED_PREVIEW_IMAGE_SIZE,
                backgroundColor: c.accent,
                borderRadius: s.$075,
              }}
            />
          </View>
        </Link>
      ) : (
        <View
          style={{
            width: FEED_PREVIEW_IMAGE_SIZE,
            height: FEED_PREVIEW_IMAGE_SIZE,
            backgroundColor: c.accent,
            borderRadius: s.$075,
          }}
        />
      )}
    </XStack>
  )
}

export const Feed = () => {
  const [items, setItems] = useState<ExpandedItem[]>([])
  const feedRefreshTrigger = useItemStore((state) => state.feedRefreshTrigger)

  const fetchFeedItems = async () => {
    try {
      const records = await pocketbase.collection('items').getList<ExpandedItem>(1, 30, {
        // TODO: remove list = false once we have a way to display lists in the feed
        // also consider showing backlog items in the feed, when we have a way to link to them
        filter: `creator != null && backlog = false && list = false`,
        sort: '-created',
        expand: 'ref,creator',
      })
      setItems(records.items)
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
        <ScrollView style={{ flex: 1 }}>
          <View style={{ height: '100%' }}>
          <View
            style={{
              gap: s.$09,
              paddingTop: s.$1,
              paddingHorizontal: s.$1half,
              width: win.width,
            }}
          >
            <YStack
              gap={s.$075}
              style={{
                flex: 1,
                paddingBottom: s.$12,
              }}
            >
              {items.map((item) => (
                <ListItem key={item.id} item={item} />
              ))}
            </YStack>
          </View>
          </View>
        </ScrollView>
      </DismissKeyboard>
      <SearchBottomSheet />
    </>
  )
}
