import { Heading, XStack, YStack } from '@/ui'
import { Image } from 'expo-image'
import { Switch } from 'react-native'
import { GridTile } from '../grid/GridTile'
import { Link } from 'expo-router'
import { s, c } from '@/features/style'
import { Shareable } from '../atoms/Shareable'

export const FirstVisitScreen = ({ profile }) => {
  const [isEnabled, setIsEnabled] = useState(false)
  const toggleSwitch = () => setIsEnabled((previousState) => !previousState)
  return (
    <>
      <Heading tag="h2normal">Thanks for signing up!</Heading>
      <Link href={`/user/${profile.userName}`}>
        <YStack
          gap={s.$1}
          style={{
            minWidth: s.$20,
            flexDirection: 'row',
            backgroundColor: c.surface2,
            padding: s.$1half,
            borderRadius: s.$08,
          }}
        >
          <XStack style={{ width: '100%', justifyContent: 'space-between' }}>
            <Heading tag="h2">{profile.userName}</Heading>
            {profile?.image && (
              <Image
                style={{ width: s.$6, height: s.$6, borderRadius: '100%' }}
                source={profile.image}
              />
            )}
          </XStack>
          <XStack style={{ width: '100%' }}>
            {/* @todo: fill tiles */}
            <GridTile />
            <GridTile />
            <GridTile />
          </XStack>

          <YStack>
            <Heading tag="h2">
              Refs is going live in Jan ‘25. Click below to get notified once it’s launched.
            </Heading>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isEnabled ? '#f5dd4b' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleSwitch}
              value={isEnabled}
            />
            <Heading tag="mutewarn">Push Notifications</Heading>
          </YStack>
        </YStack>
      </Link>

      <Shareable>
        <Heading tag="h2">Share</Heading>
      </Shareable>
    </>
  )
}
