import { YStack, XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import { c, s } from '@/features/style'
import { Profile } from '@/features/types'
import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Image } from 'expo-image'

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
        <Image
          source={profile.image || (profile as any).avatar_url || undefined}
          style={{ width: s.$6, height: s.$6, borderRadius: (s.$6 as number) / 2, backgroundColor: '#ddd' }}
          contentFit={'cover'}
          cachePolicy="memory-disk"
          priority="high"
          transition={150}
        />
      </View>

      <YStack style={{ flex: 1 }} gap={s.$05}>
        <Heading tag="h2">{profile.firstName}</Heading>
        <Heading tag="small">{profile?.location || profile.userName}</Heading>
      </YStack>
    </XStack>
  )
}
