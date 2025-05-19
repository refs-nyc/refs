import { XStack, YStack, Heading, Button } from '@/ui'
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
  const itemUrl = `${creatorProfileUrl}modal?initialId=${item.id}` as const

  return (
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
        <Link href={creatorProfileUrl}>
          <Avatar source={creator.image} size={s.$5} />
        </Link>
      )}
      <View style={{ overflow: 'hidden', flex: 1 }}>
        <Heading tag="p">
          <Link href={creatorProfileUrl}>
            <Heading tag="semistrong">{item.expand?.creator?.firstName || 'Anonymous'} </Heading>
          </Link>
          <Heading style={{ color: c.muted2 }} tag="p">
            added{' '}
          </Heading>
          <Link href={itemUrl}>
            <Heading tag="semistrong">{item.expand?.ref?.title}</Heading>
          </Link>
        </Heading>
      </View>

      {item?.image ? (
        <Link href={itemUrl}>
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
        flex: 1,
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
