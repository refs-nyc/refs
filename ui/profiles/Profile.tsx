import { Image } from 'expo-image'
import { Button } from '../buttons/Button'
import { Heading, XStack, YStack } from '@/ui'
import { GridTile } from '../grid/GridTile'
// import { useLiveQuery } from '@canvas-js/hooks'
import { useEffect, useState } from 'react'
// import { useCanvasContext } from '@/features/canvas/contract'
import { s, c } from '@/features/style'
import { pocketbase, useProfileStore } from '@/features/canvas/stores'
import { Shareable } from "../atoms/Shareable"

export const Profile = ({ userName }: { userName: string }) => {
  const [profile, setProfile] = useState()

  useEffect(() => {
    const getProfile = async (user: string) => {
      try {
        const record = await pocketbase.collection('profiles').getFirstListItem(`userName = "${user}"`)
        console.log(record)
        setProfile(record)
      } catch (error) {
        console.error(error)
      }
    }

    getProfile(userName)
    
  }, [userName])

  // const sub = pocketbase.subscribe()
  // const app = useCanvasContext()
  // const [profile] = useLiveQuery(app, 'profiles', { where: { userName: userName } }) || [undefined]
  // const profiles = useLiveQuery(app, 'profiles')

  useEffect(() => console.log(profile), [profile])

  return (
    <YStack
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: s.$1half,
      }}
      gap={s.$4}
    >
      <Heading tag="h2normal">Thanks for signing up!</Heading>
      {/* Profile card */}
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
          <Heading tag="h2">{userName}</Heading>
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
      </YStack>

      <Shareable>
        <Heading tag="h2">
          Share
        </Heading>
      </Shareable>

      {!profile && <Heading tag="h1">Profile not found</Heading>}
    </YStack>
  )
}
