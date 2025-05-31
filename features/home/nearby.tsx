import { XStack, YStack, Heading, Button, Text } from '@/ui'
import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { Link } from 'expo-router'
import { View, Dimensions } from 'react-native'
import { s, c } from '@/features/style'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { Avatar } from '@/ui/atoms/Avatar'
import { useUserStore } from '@/features/pocketbase/stores/users'
const win = Dimensions.get('window')

const ListItem = ({ item }: { item: ExpandedItem }) => {
  const creator = item.expand!.creator
  const creatorProfileUrl = `/user/${creator.userName}/` as const
  const itemUrl = `${creatorProfileUrl}modal?initialId=${item.id}&openedFromFeed=true` as const

  return (
    <XStack
      key={item.id}
      gap={s.$08}
      style={{
        paddingVertical: s.$05,
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
      }}
    >
      {item.expand?.creator && (
        <Link href={creatorProfileUrl}>
          <Avatar source={creator.image} size={s.$4} />
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
          <SimplePinataImage
            originalSource={item.image}
            imageOptions={{ width: s.$5, height: s.$5 }}
            style={{
              width: s.$4,
              height: s.$4,
              backgroundColor: c.accent,
              borderRadius: s.$075,
            }}
          />
        </Link>
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
  )
}

export const Nearby = ({ items }: { items: ExpandedItem[] }) => {
  const { logout } = useUserStore()

  return (
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
          paddingBottom: s.$1,
        }}
      >
        {items.map((item) => (
          <ListItem key={item.id} item={item} />
        ))}

        <View style={{ marginBottom: s.$2, alignItems: 'center' }}>
          <Button
            style={{ width: 20 }}
            variant="inlineSmallMuted"
            title="Log out"
            onPress={logout}
          />
        </View>
      </YStack>
    </View>
  )
}
