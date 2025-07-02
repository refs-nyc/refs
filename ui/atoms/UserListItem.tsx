import { Profile } from '@/features/pocketbase/stores/types'
import { s, c } from '@/features/style'
import { View, Text } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { XStack, YStack } from '../core/Stacks'
import { Avatar } from './Avatar'

export default function UserListItem({
  user,
  small,
  onPress,
  text,
  whiteText,
  style,
}: {
  user: Profile
  small: boolean
  onPress?: () => void
  text?: string
  whiteText?: boolean
  style?: any
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: small ? s.$05 : s.$075,
        paddingHorizontal: s.$075,
        borderRadius: s.$1,
        width: '100%',
        ...style,
      }}
    >
      <View>
        <XStack style={{ justifyContent: 'space-between', width: '100%' }}>
          <XStack gap={s.$1} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Avatar source={user.image} size={small ? s.$4 : s.$5} />
            <YStack>
              <Text style={{ fontSize: 14, color: whiteText ? c.surface : c.muted, fontWeight: '700' }}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={{ color: whiteText ? c.surface : c.muted }}>{user.location}</Text>
            </YStack>
          </XStack>
          {text && (
            <Text
              style={{
                flex: 1,
                color: whiteText ? c.surface : c.muted,
                alignSelf: 'flex-end',
                textAlign: 'right',
              }}
            >
              {text}
            </Text>
          )}
        </XStack>
      </View>
    </Pressable>
  )
}
