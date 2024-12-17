import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Drawer, AddRef, Heading, XStack, YStack } from '@/ui'
import { Image } from 'expo-image'
import { ProfileHeader } from './ProfileHeader'
import { GridTile } from '../grid/GridTile'
import { Grid } from '../grid/Grid'
import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
// import { useCanvasContext } from '@/features/canvas/contract'
import { s, c } from '@/features/style'
import { pocketbase, useProfileStore } from '@/features/canvas/stores'
import { Shareable } from '../atoms/Shareable'
import Ionicons from '@expo/vector-icons/Ionicons'
import { ScrollView } from 'react-native-gesture-handler'

export const Profile = ({ userName }: { userName: string }) => {
  const insets = useSafeAreaInsets()
  const { firstVisit } = useLocalSearchParams()
  const [profile, setProfile] = useState()
  const [adding, setAdding] = useState(false)

  const { userProfile } = useProfileStore()

  useEffect(() => {
    const getProfile = async (user: string) => {
      try {
        const record = await pocketbase
          .collection('profiles')
          .getFirstListItem(`userName = "${user}"`, { expand: 'items' })
        console.log(record)
        setProfile(record)
      } catch (error) {
        console.error(error)
      }
    }

    getProfile(userName)
  }, [userName])

  useEffect(() => console.log(profile), [profile])

  return (
    <>
      <ScrollView style={{ paddingTop: Math.max(insets.top, 16) }}>
        <YStack
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: s.$1half,
          }}
          gap={s.$4}
        >
          {firstVisit && (
            <>
              <Heading tag="h2normal">Thanks for signing up!</Heading>
              <Link href={`/user/${userName}`}>
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
              </Link>

              <Shareable>
                <Heading tag="h2">Share</Heading>
              </Shareable>
            </>
          )}

          {!firstVisit && profile && (
            <View
              style={{
                flex: 1,
                width: '100%',
                marginHorizontal: s.$1half,
              }}
            >
              <ProfileHeader profile={profile} />
              <Grid
                canAdd={userProfile.userName === userName}
                onAddItem={() => {
                  setAdding(true)
                }}
                columns={3}
                items={profile?.expand?.items || []}
                rows={4}
              ></Grid>
              {/* Backlog toggle */}
              <XStack
                style={{
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginVertical: s.$1,
                }}
                gap={s.$08}
              >
                <Heading tag="h3normal">My Backlog</Heading>
                <View style={{ height: s.$025, backgroundColor: c.black, flex: 1 }}></View>
                <Ionicons size={s.$3} name="add-circle-outline" />
              </XStack>
            </View>
          )}

          {!profile && <Heading tag="h1">Profile not found</Heading>}
        </YStack>
      </ScrollView>

      {adding && (
        <Drawer close={() => setAdding(false)}>
          <AddRef
            onAddRef={() => {
              console.log('we have added ')
              setAdding(false)
            }}
            onCancel={() => {
              setAdding(false)
            }}
          />
        </Drawer>
      )}
    </>
  )
}
