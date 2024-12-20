import { useState } from 'react'
import { Heading, XStack, YStack } from '@/ui'
import { Image } from 'expo-image'
import { Switch, View } from 'react-native'
import { GridTile } from '../grid/GridTile'
import { Link, router } from 'expo-router'
import { s, c } from '@/features/style'
import { Profile } from "@/features/pocketbase/stores/types"

export const FirstVisitScreen = ({ user }: { user: Profile}) => {
  const [isEnabled, setIsEnabled] = useState(false)
  const toggleSwitch = () => {
    setIsEnabled((previousState) => !previousState)
    // @todo: sign them up
    router.push(`/user/${user.userName}`)
  }

  return (
    <YStack gap={s.$3} screenHeight style={{ flex: 1, justifyContent: 'center' }}>
      <Heading style={{ textAlign: 'center' }} tag="h2normal">
        Thanks for signing up!
      </Heading>
      <Link href={`/user/${user.userName}`}>
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
            <Heading tag="h2">{user.userName}</Heading>
            {user?.image && (
              <Image
                style={{ width: s.$6, height: s.$6, borderRadius: '100%' }}
                source={user.image}
              />
            )}
          </XStack>
          <XStack style={{ width: '100%' }}>
            <View style={{ width: '33.33%' }}>
              <GridTile backgroundColor={c.surface} />
            </View>
            <View style={{ width: '33.33%' }}>
              <GridTile backgroundColor={c.surface} />
            </View>
            <View style={{ width: '33.33%' }}>
              <GridTile backgroundColor={c.surface} />
            </View>
          </XStack>
        </YStack>
      </Link>
      {/* <Shareable style={{ width: '100%' }}>
        <Button variant="fluid" title="Share"></Button>
      </Shareable> */}

      <YStack style={{ justifyContent: 'center', alignItems: 'center' }} gap={s.$2}>
        <Heading tag="h3normal" style={{ textAlign: 'center' }}>
          Refs is going live on Jan ‘25. {'\n'} Get notified once it’s launched.
        </Heading>
        <Switch
          trackColor={{ false: c.surface, true: c.accent2 }}
          thumbColor={isEnabled ? c.accent : c.surface2}
          ios_backgroundColor={c.white}
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
        <Heading tag="mutewarn">Push Notifications</Heading>
      </YStack>
    </YStack>
  )
}
