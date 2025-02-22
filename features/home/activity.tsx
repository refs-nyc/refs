import { XStack, YStack, Heading } from '@/ui'
import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { Link } from 'expo-router'
import { View, Dimensions } from 'react-native'
import { s, c } from '@/features/style'
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
            style={{ paddingVertical: s.$05, alignItems: 'center' }}
          >
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

            <Link
              href={item.expand?.creator ? `/user/${item.expand.creator?.userName}` : '/'}
              style={{ overflow: 'hidden', width: win.width - s.$12 }}
            >
              <Heading tag="p">
                <Heading tag="semistrong">{item.expand?.creator?.userName || 'Anonymous'} </Heading>
                <Heading style={{ color: c.muted2 }} tag="p">
                  added{' '}
                </Heading>
                <Heading tag="semistrong">{item.expand?.ref?.title}</Heading>
              </Heading>
            </Link>
          </XStack>
        ))}
      </YStack>
    </View>
  )
}
