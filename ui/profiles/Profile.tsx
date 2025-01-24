import type { Item } from '@/features/pocketbase/stores/types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Drawer, AddRef, Heading, XStack, YStack, Button } from '@/ui'
import { useUIStore } from '../state'
import { ProfileHeader } from './ProfileHeader'
import { FirstVisitScreen } from './FirstVisitScreen'
import { Grid } from '../grid/Grid'
import { useLocalSearchParams, router } from 'expo-router'
import { RefListItem } from '../atoms/RefListItem'
import { useEffect, useState, useMemo } from 'react'
import { View, Text } from 'react-native'
import { s, c } from '@/features/style'
import { pocketbase, useUserStore, removeFromProfile, useItemStore } from '@/features/pocketbase'
import Ionicons from '@expo/vector-icons/Ionicons'
import { FlatList, Pressable, ScrollView } from 'react-native-gesture-handler'
import { Profile as ProfileType } from '@/features/pocketbase/stores/types'
import { isProfile } from '@/features/pocketbase/stores/users'
import { gridSort, createdSort } from '@/ui/profiles/sorts'

export const Profile = ({ userName }: { userName: string }) => {
  const { firstVisit } = useLocalSearchParams()

  const { editingBacklog, stopEditBacklog, startEditBacklog } = useUIStore()

  const insets = useSafeAreaInsets()
  const [profile, setProfile] = useState<ProfileType>()
  const [addingTo, setAddingTo] = useState<'' | 'grid' | 'backlog'>('')
  const [gridItems, setGridItems] = useState<Item[]>([])
  const [backlogItems, setBacklogItems] = useState<Item[]>([])
  const [removingId, setRemovingId] = useState('')

  const { user, logout } = useUserStore()
  const { remove, moveToBacklog } = useItemStore()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleMoveToBacklog = async () => {
    try {
      const updatedRecord = await moveToBacklog(removingId)
      setRemovingId('')
      await refreshGrid(userName)
    } catch (error) {
      console.error(error)
    }
  }

  const refreshGrid = async (userName: string) => {
    try {
      const record = await pocketbase
        .collection<ProfileType>('users')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

      setProfile(record)

      const itms = record?.expand?.items?.filter((itm: Item) => !itm.backlog).sort(gridSort) || []
      const bklg = record?.expand?.items?.filter((itm: Item) => itm.backlog).sort(createdSort) || []

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
  }, [pocketbase.authStore, pocketbase, userName, user])

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
          {firstVisit && user && isProfile(user) && <FirstVisitScreen user={user} />}

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
                onRemoveItem={setRemovingId}
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
                    <YStack gap={s.$075}>
                      {backlogItems.map((itm) => (
                        <Pressable
                          key={itm.id}
                          onPress={stopEditBacklog}
                          onLongPress={() => {
                            startEditBacklog()
                          }}
                        >
                          {editingBacklog && (
                            <YStack style={{ position: 'absolute', zIndex: 999, top: 0, right: 0 }}>
                              <Pressable
                                onPress={async () => {
                                  stopEditBacklog()
                                  await remove(itm.id)
                                  await refreshGrid(userName)
                                }}
                                style={{
                                  transform: 'translate(8px, -8px)',
                                  backgroundColor: c.grey1,
                                  borderRadius: '100%',
                                }}
                              >
                                <Ionicons size={12} style={{ padding: 6 }} name="close" />
                              </Pressable>
                            </YStack>
                          )}
                          <RefListItem
                            backgroundColor={editingBacklog ? c.surface2 : c.surface}
                            key={itm.id}
                            r={itm?.expand?.ref}
                          />
                        </Pressable>
                      ))}
                      {/* <FlatList
                        horizontal={false}
                        data={backlogItems}
                        keyExtractor={(item: Item) => item.id}
                        renderItem={({ item }) => <RefListItem r={item?.expand?.ref} />}
                      /> */}
                    </YStack>
                  ) : (
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

          <Button
            style={{ marginTop: s.$12, marginBottom: 0 }}
            title="Home"
            variant="basic"
            onPress={() => router.push('/')}
          />
          <Button
            style={{ marginBottom: s.$12 }}
            title="Logout"
            variant="basic"
            onPress={() => handleLogout()}
          />
        </YStack>
      </ScrollView>

      {removingId !== '' && (
        <Drawer close={() => setRemovingId('')}>
          <YStack gap={s.$08} style={{ marginTop: s.$3, marginBottom: s.$6 }}>
            <Button
              onPress={handleMoveToBacklog}
              title={`Move to backlog`}
              variant="outlineFluid"
            />
            <Button
              onPress={async () => {
                await removeFromProfile(removingId)
                setRemovingId('')
                await refreshGrid(userName)
              }}
              title="Remove"
              variant="fluid"
            />
          </YStack>
        </Drawer>
      )}

      {addingTo !== '' && (
        <Drawer close={() => setAddingTo('')}>
          <AddRef
            backlog={addingTo === 'backlog'}
            onAddRef={async (itm: Item) => {
              console.log(itm)
              await refreshGrid(userName)
              if (itm?.list) router.push(`/user/${userName}/details?initialId=${itm.id}`)
              console.log(itm.id)
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
