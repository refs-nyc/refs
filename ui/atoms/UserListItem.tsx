import { Profile } from '@/features/types'
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
  contentStyle,
  primaryColor,
  secondaryColor,
}: {
  user: Profile
  small: boolean
  onPress?: () => void
  text?: string
  whiteText?: boolean
  style?: any
  contentStyle?: any
  primaryColor?: string
  secondaryColor?: string
}) {
  const mainColor = primaryColor ?? (whiteText ? c.surface : c.black)
  const subColor = secondaryColor ?? (whiteText ? c.surface : c.newDark)
  const nameFontSize = small ? 14 : (s.$09 as number) + 1
  const avatarSize = small ? (s.$4 as number) : 60

  const locationText = (user.location || '').trim() || 'Elsewhere'

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: small ? s.$05 : s.$075,
        paddingHorizontal: small ? s.$05 : s.$075,
        borderRadius: s.$1,
        width: '100%',
        alignItems: 'flex-start',
        ...style,
      }}
    >
      <View style={{ width: '100%' }}>
        <XStack style={{ justifyContent: 'flex-start', alignItems: 'center', width: '100%', ...(contentStyle ?? {}) }}>
          <Avatar
            source={user.image || (user as any)?.avatar_url}
            fallback={user.firstName || user.name || user.userName}
            size={avatarSize}
          />
          <YStack style={{ marginLeft: s.$1, alignItems: 'flex-start', gap: 4 }}>
            <Text
              style={{
                fontSize: nameFontSize,
                color: mainColor,
                fontWeight: '700',
                textAlign: 'left',
              }}
            >
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName
                ? user.firstName
                : user.lastName
                ? user.lastName
                : user.userName || user.name || 'Unknown User'}
            </Text>
            <Text style={{ color: subColor, textAlign: 'left' }}>
              {locationText}
            </Text>
          </YStack>
        </XStack>
        {text && (
          <Text
            style={{
              flex: 1,
              color: mainColor,
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
