import { YStack, XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import { s } from '@/features/style'
import { Profile } from '@/features/pocketbase/stores/types'
import { Avatar } from '../atoms/Avatar'

export const ProfileHeader = ({ profile }: { profile: Profile }) => {
  return (
    <YStack
      gap={0}
      style={{
        minWidth: s.$20,
        flexDirection: 'row',
        borderRadius: s.$08,
        marginBottom: s.$075,
        paddingTop: s.$1,
        paddingBottom: s.$075,
      }}
    >
      <XStack
        gap={s.$09}
        style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <XStack
          gap={s.$09}
          style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Avatar source={profile.image} size={s.$6} />
          <YStack style={{ flex: 1 }} gap={s.$05}>
            <Heading tag="h2">{profile.firstName}</Heading>
            <Heading tag="small">{profile?.location || profile.userName}</Heading>
          </YStack>
        </XStack>
      </XStack>
    </YStack>
  )
}
