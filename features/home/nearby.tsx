import { XStack, YStack, Heading } from '@/ui'
import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { Link } from 'expo-router'
import { View, Dimensions } from 'react-native'
import { s, c } from '@/features/style'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'

const win = Dimensions.get('window')

export const Nearby = ({ items }: { items: ExpandedItem[] }) => {
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
        Nearby
      </Heading>

      <YStack
        gap={s.$075}
        style={{
          flex: 1,
          paddingBottom: s.$12,
        }}
      >
        {items.map((item) => (
          <XStack
            key={item.id}
            gap={s.$09}
            style={{
              paddingVertical: s.$05,
              alignItems: 'center',
              width: '100%',
              justifyContent: 'space-between',
            }}
          >
            {item.expand?.creator && (
              <Link href={item.expand?.creator ? `/user/${item.expand.creator?.userName}` : '/'}>
                <SimplePinataImage
                  originalSource={item.expand.creator?.image}
                  imageOptions={{ width: s.$5, height: s.$5 }}
                  style={{
                    width: s.$5,
                    height: s.$5,
                    backgroundColor: c.accent,
                    borderRadius: 100,
                  }}
                />
              </Link>
            )}
            <View style={{ overflow: 'hidden', flex: 1 }}>
              <Heading tag="p">
                <Link href={item.expand?.creator ? `/user/${item.expand.creator?.userName}` : '/'}>
                  <Heading tag="semistrong">
                    {item.expand?.creator?.firstName || 'Anonymous'}{' '}
                  </Heading>
                </Link>
                <Heading style={{ color: c.muted2 }} tag="p">
                  added{' '}
                </Heading>
                <Link
                  href={
                    item.expand?.creator
                      ? item.backlog
                        ? `/user/${item.expand.creator?.userName}`
                        : `/user/${item.expand.creator?.userName}/modal?initialId=${item.id}`
                      : '/'
                  }
                >
                  <Heading tag="semistrong">{item.expand?.ref?.title}</Heading>
                </Link>
              </Heading>
            </View>

            {item?.image ? (
              <SimplePinataImage
                originalSource={item.image}
                imageOptions={{ width: s.$5, height: s.$5 }}
                style={{
                  width: s.$5,
                  height: s.$5,
                  backgroundColor: c.accent,
                  borderRadius: s.$075,
                }}
              />
            ) : (
              <View
                style={{
                  width: s.$5,
                  height: s.$5,
                  backgroundColor: c.accent,
                  borderRadius: s.$075,
                }}
              />
            )}
          </XStack>
        ))}
      </YStack>
    </View>
  )
}
