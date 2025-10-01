import { YStack, XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import { c, s } from '@/features/style'
import { Profile } from '@/features/types'
import { Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import Svg, { Circle } from 'react-native-svg'

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
        {profile.image || (profile as any).avatar_url ? (
          <Image
            source={profile.image || (profile as any).avatar_url || undefined}
            style={{ width: s.$6, height: s.$6, borderRadius: (s.$6 as number) / 2, backgroundColor: c.surface2 }}
            contentFit={'cover'}
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
        ) : (
          <View
            style={{
              width: s.$6,
              height: s.$6,
              borderRadius: (s.$6 as number) / 2,
              backgroundColor: c.surface2,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Svg width={32} height={20} viewBox="0 0 64 40">
              <Circle cx="24" cy="20" r="16" stroke={c.muted} strokeWidth={2} fill="none" />
              <Circle cx="40" cy="20" r="16" stroke={c.muted} strokeWidth={2} fill="none" />
            </Svg>
          </View>
        )}
      </View>

      <YStack style={{ flex: 1 }} gap={s.$05}>
        <Heading tag="h2">{profile.firstName}</Heading>
        <Heading tag="small">{profile?.location || profile.userName}</Heading>
      </YStack>
    </XStack>
  )
}
