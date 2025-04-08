import { XStack, YStack, Heading } from '@/ui'
import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { Link } from 'expo-router'
import { View, Dimensions } from 'react-native'
import { useUserStore } from '@/features/pocketbase'
import { s, c } from '@/features/style'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import Ionicons from '@expo/vector-icons/Ionicons'
const win = Dimensions.get('window')

const ListItem = ({ item }: { item: ExpandedItem }) => {
  const { user } = useUserStore()
  const creator = item.expand!.creator
  const createdByCurrentUser = user && creator.userName === user?.userName

  const creatorProfileUrl = createdByCurrentUser
    ? ('/' as const)
    : (`/user/${creator.userName}/` as const)
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
        <Link dismissTo={creatorProfileUrl === '/'} href={creatorProfileUrl}>
          {creator.image ? (
            <SimplePinataImage
              originalSource={creator.image}
              imageOptions={{ width: s.$5, height: s.$5 }}
              style={{
                width: s.$5,
                height: s.$5,
                backgroundColor: c.accent,
                borderRadius: 100,
              }}
            />
          ) : (
            <Ionicons name="person" size={s.$5} color={c.accent} />
          )}
        </Link>
      )}
      <View style={{ overflow: 'hidden', flex: 1 }}>
        <Heading tag="p">
          <Link dismissTo={creatorProfileUrl === '/'} href={creatorProfileUrl}>
            <Heading tag="semistrong">{item.expand?.creator?.firstName || 'Anonymous'} </Heading>
          </Link>
          <Heading style={{ color: c.muted2 }} tag="p">
            added{' '}
          </Heading>
          <Link href={item.expand?.creator ? (item.backlog ? creatorProfileUrl : itemUrl) : '/'}>
            <Heading tag="semistrong">{item.expand?.ref?.title}</Heading>
          </Link>
        </Heading>
      </View>

      {item?.image ? (
        <Link href={item.expand?.creator ? (item.backlog ? creatorProfileUrl : itemUrl) : '/'}>
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
          <ListItem key={item.id} item={item} />
        ))}
      </YStack>
    </View>
  )
}
