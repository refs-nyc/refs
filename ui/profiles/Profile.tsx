import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Drawer, AddRef, Heading, XStack, YStack } from '@/ui'
import { ProfileHeader } from './ProfileHeader'
import { FirstVisitScreen } from './FirstVisitScreen'
import { Grid } from '../grid/Grid'
import { useLocalSearchParams } from 'expo-router'
import { RefListItem } from '../atoms/RefListItem'
import { useEffect, useState, useMemo } from 'react'
import { View, Text } from 'react-native'
// import { useCanvasContext } from '@/features/pocketbase/contract'
import { s, c } from '@/features/style'
import { pocketbase, useUserStore } from '@/features/pocketbase'
import { Shareable } from '../atoms/Shareable'
import Ionicons from '@expo/vector-icons/Ionicons'
import { FlatList, Pressable, ScrollView } from 'react-native-gesture-handler'

export const Profile = ({ userName }: { userName: string }) => {
  const insets = useSafeAreaInsets()
  const { firstVisit } = useLocalSearchParams()
  const [profile, setProfile] = useState()
  const [addingTo, setAddingTo] = useState<'' | 'grid' | 'backlog'>('')
  const [gridItems, setGridItems] = useState([])
  const [backlogItems, setBacklogItems] = useState([])

  const { user } = useUserStore()

  const createdSort = (a: string, b: string) => {
    return new Date(a.created) - new Date(b.created)
  }

  const gridSort = (a: string, b: string) => {
    // Items with order get their exact position (0-11)
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order
    }
    // Items with order always come before items without
    if (a.order !== undefined) return -1
    if (b.order !== undefined) return 1
    // For items without order, sort by creation date
    return new Date(a.created) - new Date(b.created)
  }

  const refreshGrid = async (userName: string) => {
    try {
      const record = await pocketbase
        .collection('users')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

      setProfile(record)

      const itms = record?.expand?.items?.filter((itm) => !itm.backlog).sort(gridSort) || []
      const bklg = record?.expand?.items?.filter((itm) => itm.backlog).sort(createdSort) || []

      // Filter out backlog and normal
      setGridItems(itms)
      setBacklogItems(bklg)
    } catch (error) {
      console.error(error)
    }
  }

  const canAdd = useMemo(() => {
    console.log(pocketbase?.authStore?.record?.userName)
    return pocketbase?.authStore?.record?.userName === userName
  }, [pocketbase.authStore, userName, user])

  useEffect(() => {
    const getProfile = async () => {
      try {
        await refreshGrid(userName)
      } catch (error) {
        console.error(error)
      }
    }

    getProfile()
  }, [userName])

  useEffect(() => console.log(user), [user])

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
          {firstVisit && user && <FirstVisitScreen user={user} />}

          {!firstVisit && profile && (
            <View
              style={{
                flex: 1,
                width: '100%',
                marginHorizontal: s.$1half,
              }}
            >
              <ProfileHeader profile={profile} />

              {/* THE GRID! */}
              <Grid
                canAdd={canAdd}
                onAddItem={() => {
                  setAddingTo('grid')
                }}
                columns={3}
                items={gridItems}
                rows={4}
              ></Grid>

              {canAdd && (
                <>
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
                    <Pressable onPress={() => setAddingTo('backlog')}>
                      <Ionicons size={s.$3} name="add-circle-outline" />
                    </Pressable>
                  </XStack>

                  {backlogItems.length > 0 || gridItems.length === 12 ? (
                    <YStack>
                      <FlatList
                        horizontal={false}
                        data={backlogItems}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <RefListItem r={item?.expand?.ref} />}
                      />
                    </YStack>
                  ) : (
                    // <View style={{ marginBottom: s.$10 }}>
                    //   <Grid
                    //     canAdd={user.userName === userName}
                    //     onAddItem={() => {
                    //       setAddingTo('backlog')
                    //     }}
                    //     columns={3}
                    //     items={backlogItems}
                    //     rows={Math.ceil((backlogItems.length + 1) / 3)}
                    //   />
                    // </View>
                    <Heading style={{ textAlign: 'center' }} tag="mutewarn">
                      Add refs to your backlog. They’ll be searchable to others, but won’t show up
                      on your grid.
                    </Heading>
                  )}
                </>
              )}
            </View>
          )}

          {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}
        </YStack>
      </ScrollView>

      {addingTo !== '' && (
        <Drawer close={() => setAddingTo('')}>
          <AddRef
            backlog={addingTo === 'backlog'}
            onAddRef={() => {
              refreshGrid(userName)
              setAddingTo('')
            }}
            onCancel={() => {
              setAddingTo('')
            }}
          />
        </Drawer>
      )}
    </>
  )
}
