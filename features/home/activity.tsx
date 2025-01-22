import { useState, useEffect } from 'react'
import { SearchRef, XStack, YStack, Heading } from '@/ui'
import { pocketbase } from '@/features/pocketbase'
import type { Item } from '@/features/pocketbase/stores/types'
import { Link, router } from 'expo-router'
import { FlatList } from 'react-native-gesture-handler'
import { ScrollView, View, Dimensions } from 'react-native'
import { s, c } from '@/features/style'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'

const win = Dimensions.get('window')

export const Activity = ({ items }: { items: Item[] }) => {
  return (
    <YStack
      gap={s.$09}
      style={{
        paddingHorizontal: s.$1half,
        width: win.width,
        height: win.height * 0.6,
      }}
    >
      <Heading tag="p">Activity</Heading>
      <ScrollView style={{ flex: 1 }}>
        <YStack
          style={{
            flex: 1,
            gap: s.$025,
            paddingBottom: s.$4,
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

              <Link href={item.expand?.creator ? `/user/${item.expand.creator?.userName}` : '/'}>
                <Heading tag="p">
                  <Heading tag="strong">{item.expand?.creator?.userName || 'Anonymous'}</Heading>{' '}
                  added <Heading tag="strong">{item.expand?.ref?.title}</Heading>
                </Heading>
              </Link>
            </XStack>
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
