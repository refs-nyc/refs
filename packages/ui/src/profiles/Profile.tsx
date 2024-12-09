import { View, Text, YStack } from 'tamagui'
import { useLiveQuery } from '@canvas-js/hooks'
import { useCanvasContext } from 'app/features/canvas/contract'

export const Profile = ({ userName }) => {
  const app = useCanvasContext()

  const profile = useLiveQuery(app, 'profiles', { where: { userName } })
  const profiles = useLiveQuery(app, 'profiles')

  return (
    <YStack flex={1} jc="center" ai="center">
      <Text>{userName}</Text>
      {profile?.avatar && <Text>a{profile.avatar}</Text>}
      {profiles && <Text>{profiles.length}</Text>}
    </YStack>
  )
}
