import { Profile } from '@/features/pocketbase/stores/types'
import { s, c } from '@/features/style'
import { Link } from 'expo-router'
import { View, Text } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { Avatar } from './Avatar'

export default function UserListItem({ user }: { user: Profile }) {
  return (
    <View style={{ padding: s.$05, borderRadius: s.$075 }}>
      <Link href={`/user/${user.userName}`}>
        <XStack gap={s.$1}>
          <Avatar source={user.image} size={s.$5} />
          <YStack>
            <Text>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={{ color: c.muted }}>{user.location}</Text>
          </YStack>
        </XStack>
      </Link>
    </View>
  )
}
