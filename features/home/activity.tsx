import { useState, useEffect } from 'react'
import { SearchRef, XStack, YStack, Heading } from '@/ui'
import { pocketbase } from '@/features/pocketbase'
import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { Link, router } from 'expo-router'
import { FlatList } from 'react-native-gesture-handler'
import { ScrollView, View, Dimensions } from 'react-native'
import { s, c } from '@/features/style'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'

const win = Dimensions.get('window')

export const Activity = ({ items }: { items: ExpandedItem[] }) => {
  return (
    <View
      style={{
        flex: 1,
        gap: s.$09,
        // paddingTop: win.height * 0.4,
        paddingHorizontal: s.$1half,
        width: win.width,
      }}
    >
      <Heading tag="p" style={{ marginBottom: s.$1 }}>
        Activity
      </Heading>

      <YStack
        style={{
          flex: 1,
          gap: s.$025,
          paddingBottom: s.$12,
        }}
      >
        {items.map((item) => (
          <XStack key={item.id} gap={s.$1} style={{ paddingVertical: s.$05 }}>
            {item?.image ? (
              <SimplePinataImage
                originalSource={item.image}
                imageOptions={{ width: s.$3, height: s.$3 }}
                style={{
                  width: s.$3,
                  height: s.$3,
                  backgroundColor: c.accent,
                  borderRadius: s.$075,
                }}
              />
            ) : (
              <View
                style={{
                  width: s.$3,
                  height: s.$3,
                  backgroundColor: c.accent,
                  borderRadius: s.$075,
                }}
              />
            )}

            <Link
              href={item.expand?.creator ? `/user/${item.expand.creator?.userName}` : '/'}
              style={{ overflow: 'hidden', width: win.width - s.$9 }}
            >
              <Heading tag="p">
                <Heading tag="strong">{item.expand?.creator?.userName || 'Anonymous'}</Heading>{' '}
                added <Heading tag="strong">{item.expand?.ref?.title}</Heading>
              </Heading>
            </Link>
          </XStack>
        ))}
      </YStack>
    </View>
  )
}
