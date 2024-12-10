import { Text } from 'react-native'
import { YStack } from '@/ui'
import { useLiveQuery } from '@canvas-js/hooks'
import { useEffect } from 'react'
import { useCanvasContext } from '@/features/canvas/contract'

export const Profile = ({ userName }) => {
  const app = useCanvasContext()

  const [profile] = useLiveQuery(app, 'profiles', { where: { userName: userName } }) || [undefined]
  const profiles = useLiveQuery(app, 'profiles')

  useEffect(() => console.log(profile), [profile])

  return (
    <YStack flex={1} jc="center" ai="center">
      <Text>{userName}</Text>
      {profile?.image && <Text>{profile.image}</Text>}
      {profiles && <Text>{profiles.length}</Text>}
    </YStack>
  )
}
