import { Profile } from '@/features/pocketbase/types'
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
        alignItems: 'flex-start',
        ...style,
      }}
    >
      <View style={{ width: '100%' }}>
        <XStack style={{ justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
          <Avatar source={user.image} size={small ? s.$4 : s.$5} />
          <YStack style={{ marginLeft: s.$1, alignItems: 'flex-start' }}>
            <Text
              style={{
                fontSize: 14,
                color: whiteText ? c.surface : c.muted,
                fontWeight: '700',
                textAlign: 'left',
              }}
            >
              {user.firstName} {user.lastName}
            </Text>
            <Text style={{ color: whiteText ? c.surface : c.muted, textAlign: 'left' }}>
              {user.location}
            </Text>
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
      </View>
    </Pressable>
  )
}
