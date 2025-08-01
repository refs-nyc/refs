import { YStack, XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import { c, s } from '@/features/style'
import { Profile } from '@/features/types'
import { Avatar } from '../atoms/Avatar'
import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

export const ProfileHeader = ({ profile }: { profile: Profile }) => {
  return (
    <XStack
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: s.$08,
        marginBottom: s.$075,
        paddingTop: s.$1,
        paddingBottom: s.$075,
        paddingLeft: s.$075,
      }}
    >
      <View style={{ left: -s.$075 }}>
        <Avatar source={profile.image} size={s.$6} />
      </View>

      <YStack style={{ flex: 1 }} gap={s.$05}>
        <Heading tag="h2">{profile.firstName}</Heading>
        <Heading tag="small">{profile?.location || profile.did}</Heading>
      </YStack>
    </XStack>
  )
}
