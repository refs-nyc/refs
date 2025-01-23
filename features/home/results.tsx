import { XStack, YStack, Heading } from '@/ui'
import type { Item } from '@/features/pocketbase/stores/types'
import { Link, router } from 'expo-router'
import { ScrollView, View, Dimensions, KeyboardAvoidingView } from 'react-native'
import { s, c } from '@/features/style'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'

const win = Dimensions.get('window')

export const SearchResults = ({ results }: { results: Item[] }) => {
  return (
    <KeyboardAvoidingView
      style={{
        paddingHorizontal: s.$1half,
        paddingTop: win.height * 0.2,
        position: 'absolute',
      }}
      behavior="height"
    >
      <YStack
        gap={s.$09}
        style={{
          width: win.width,
          height: '100%',
        }}
      >
        <ScrollView style={{ flex: 1 }}>
          <YStack
            style={{
              flex: 1,
              gap: s.$025,
              paddingBottom: s.$4,
            }}
          >
            {results.map((item) => (
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
    </KeyboardAvoidingView>
  )
}
