import type { Item } from '@/features/pocketbase/stores/types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Drawer } from '@/ui/drawers/Drawer'
import { Button } from '@/ui/buttons/Button'
import { Heading } from '@/ui/typo/Heading'
import { NewRef } from '@/ui/actions/NewRef'
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
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import Ionicons from '@expo/vector-icons/Ionicons'
import { FlatList, Pressable, ScrollView } from 'react-native-gesture-handler'
import {
  Profile as ProfileType,
  ExpandedProfile,
  ExpandedItem,
} from '@/features/pocketbase/stores/types'
import { isProfile } from '@/features/pocketbase/stores/users'
import { gridSort, createdSort } from '@/ui/profiles/sorts'
import { DrawerContent } from '@/ui/drawers/DrawerContent'

export const Profile = ({ userName }: { userName: string }) => {
  const { firstVisit, addingTo, removingId } = useLocalSearchParams()

  const { editingBacklog, stopEditBacklog, startEditBacklog } = useUIStore()
  const { hasShareIntent } = useShareIntentContext()

  const insets = useSafeAreaInsets()
  const [profile, setProfile] = useState<ProfileType>()
  // const [addingTo, setAddingTo] = useState<'' | 'grid' | 'backlog'>('')
  const [gridItems, setGridItems] = useState<Item[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [canAdd, setCanAdd] = useState<boolean>(false)
  // const [removingId, setRemovingId] = useState('')

  const { user, getProfile } = useUserStore()
  const { remove, moveToBacklog } = useItemStore()

  const setAddingTo = (str: string) => {
    router.setParams({ addingTo: str })
  }
  const setRemovingId = (str: string) => {
    router.setParams({ removingId: str })
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
      setGridItems([])
      setBacklogItems([])
      const record = await pocketbase
        .collection<ProfileType>('users')
        .getFirstListItem<ExpandedProfile>(`userName = "${userName}"`, {
          expand: 'items,items.ref',
        })

      setProfile(record)

      const itms = record?.expand?.items?.filter((itm: Item) => !itm.backlog).sort(gridSort) || []
      const bklg = record?.expand?.items?.filter((itm: Item) => itm.backlog).sort(createdSort) || []

      // Filter out backlog and normal
      setGridItems(itms)
      setBacklogItems(bklg as ExpandedItem[])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (hasShareIntent) {
      setAddingTo(gridItems.length < 12 ? 'grid' : 'backlog')
    }
  }, [hasShareIntent])

  useEffect(() => {
    const init = async () => {
      try {
        await getProfile(userName)
        await refreshGrid(userName)
        setCanAdd(pocketbase?.authStore?.record?.userName === userName)
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName])

  return (
    <>
      <ScrollView style={{ paddingTop: Math.max(insets.top, 16) }}>
        <YStack
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: s.$08,
            marginBottom: s.$12,
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
                    <Pressable
                      onPress={() => {
                        console.log('set adding to backlog')
                        setAddingTo('backlog')
                      }}
                    >
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
                          {itm?.expand?.ref && (
                            <RefListItem
                              backgroundColor={editingBacklog ? c.surface2 : c.surface}
                              key={itm.id}
                              r={itm?.expand?.ref}
                            />
                          )}
                        </Pressable>
                      ))}
                    </YStack>
                  ) : (
                    <Heading style={{ textAlign: 'center' }} tag="mutewarn">
                      Add refs to your backlog. They'll be searchable to others, but won't show up
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

      {removingId && (
        <Drawer close={() => setRemovingId('')}>
          <DrawerContent>
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
          </DrawerContent>
        </Drawer>
      )}

      {(addingTo === 'grid' || addingTo === 'backlog') && (
        <Drawer close={() => setAddingTo('')}>
          <DrawerContent>
            <NewRef
              backlog={addingTo === 'backlog'}
              onNewRef={async (itm: Item) => {
                await refreshGrid(userName)
                if (itm?.list) router.push(`/user/${userName}/details?initialId=${itm.id}`)
                setAddingTo('')
              }}
              onCancel={() => {
                setAddingTo('')
              }}
            />
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}
