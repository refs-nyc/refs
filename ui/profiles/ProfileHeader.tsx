import { Image } from 'expo-image'
import { YStack, XStack, Heading } from '@/ui'
import { s, c } from '@/features/style'

export const ProfileHeader = ({ profile }) => (
  <YStack
    gap={s.$1}
    style={{
      minWidth: s.$20,
      flexDirection: 'row',
      borderRadius: s.$08,
      marginBottom: s.$2,
    }}
  >
    <XStack style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
      <Heading tag="h2">{profile.userName}</Heading>
      {profile?.image && (
        <Image style={{ width: s.$8, height: s.$8, borderRadius: '100%' }} source={profile.image} />
      )}
    </XStack>
  </YStack>
)
