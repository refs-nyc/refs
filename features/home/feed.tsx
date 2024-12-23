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

export const Feed = () => {
  const [items, setItems] = useState<Item[]>([])
  const insets = useSafeAreaInsets()

  useEffect(() => {
    // The initial data we are looking for is
    // (for now) LOOSELY based off of the user's interests.
    //
    // The subscription at the moment is VERY LOOSE
    // We just serve all new item creations.
    const getInitialData = async () => {
      try {
        const records = await pocketbase
          .collection('items')
          .getList(1, 30, { filter: ``, sort: '-created', expand: 'ref,creator' })
        console.log(records.items)
        setItems(records.items)
        console.log('done')
      } catch (error) {
        console.error(error)
      }
    }

    getInitialData()

    pocketbase.collection('items').subscribe('*', (e) => {
      console.log(e.action)
      console.log(e.record)
    })
    return () => pocketbase.collection('items').unsubscribe('*')
  }, [])

  return (
    <View style={{ flex: 1, height: win.height, paddingTop: Math.max(insets.top, 16) }}>
      <YStack
        gap={s.$2}
        style={{
          height: win.height * 0.4,
          paddingTop: s.$2,
          textAlign: 'center',
        }}
      >
        <Heading style={{ textAlign: 'center' }} tag="h1">
          Refs
        </Heading>

        <SearchRef />
      </YStack>

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
              <XStack gap={s.$1} style={{ paddingVertical: s.$05 }}>
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
    </View>
  )
}
