import { Image } from 'expo-image'
import { YStack, XStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import { Shareable } from '@/ui/atoms/Shareable'
import { s, c } from '@/features/style'
import { Link, usePathname } from 'expo-router'
import { Profile } from '@/features/pocketbase/stores/types'
import { pocketbase } from '@/features/pocketbase'
import Ionicons from '@expo/vector-icons/Ionicons'

export const ProfileHeader = ({ profile }: { profile: Profile }) => {
  const pathname = usePathname()

  const url = 'https://refs.nyc' + pathname

  return (
    <YStack
      gap={s.$1}
      style={{
        minWidth: s.$20,
        flexDirection: 'row',
        borderRadius: s.$08,
        marginBottom: s.$2,
        paddingVertical: s.$1,
      }}
    >
      <XStack style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <YStack gap={s.$08}>
          <XStack gap={s.$09}>
            <Shareable url={url}>
              <Ionicons name="share-outline" size={s.$2} color={c.muted} />
            </Shareable>
          </XStack>
          <Heading tag="h2">{profile.userName}</Heading>
        </YStack>
        {profile.id === pocketbase?.authStore?.record?.id ? (
          <Link href={`/user/${pocketbase.authStore.record.userName}/settings`}>
            <Image
              style={{ width: s.$6, height: s.$6, borderRadius: s.$6 / 2 }}
              source={profile.image}
            />
          </Link>
        ) : (
          <Image
            style={{ width: s.$6, height: s.$6, borderRadius: s.$6 / 2 }}
            source={profile.image}
          />
        )}
      </XStack>
    </YStack>
  )
}
