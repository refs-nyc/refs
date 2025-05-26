import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { XStack } from '../core/Stacks'

import { pocketbase, removeFromProfile, useItemStore, useUserStore } from '@/features/pocketbase'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { getBacklogItems, getProfileItems } from '@/features/pocketbase/stores/items'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import type { Item } from '@/features/pocketbase/stores/types'
import { ExpandedItem, Profile as ProfileType } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { router, useLocalSearchParams } from 'expo-router'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Button } from '../buttons/Button'
import { YStack } from '../core/Stacks'
import { Grid } from '../grid/Grid'
import { useUIStore } from '../state'
import { Heading } from '../typo/Heading'
import BacklogList from './BacklogList'
import { DMButton } from './DMButton'
import { ProfileHeader } from './ProfileHeader'
import { NewRef } from '../actions/NewRef'

export const Profile = ({ userName }: { userName: string }) => {
  const { addingTo, removingId } = useLocalSearchParams()
  const { stopEditProfile } = useUIStore()
  const { hasShareIntent } = useShareIntentContext()

  const [profile, setProfile] = useState<ProfileType>()
  const [gridItems, setGridItems] = useState<Item[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [editingRights, seteditingRights] = useState<boolean>(false)
  const [showMessageButtons, setShowMessageButtons] = useState<boolean>(false)
  const [step, setStep] = useState('')

  const [openOtherUsersBacklog, setOpenOtherUsersBacklog] = useState(false)

  const { user } = useUserStore()

  const setAddingTo = (str: string) => {
    router.setParams({ addingTo: str })
  }
  const setRemovingId = (str: string) => {
    router.setParams({ removingId: str })
  }

  const refreshGrid = async (userName: string) => {
    try {
      const profile = await pocketbase
        .collection<ProfileType>('users')
        .getFirstListItem<ProfileType>(`userName = "${userName}"`)
      setProfile(profile)

      const gridItems = await getProfileItems(userName)
      setGridItems(gridItems)

      const backlogItems = await getBacklogItems(userName)
      setBacklogItems(backlogItems as ExpandedItem[])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (hasShareIntent) {
      setAddingTo(gridItems.length < 12 ? 'grid' : 'backlog')
      bottomSheetRef.current?.snapToIndex(1)
    }
  }, [hasShareIntent])

  useEffect(() => {
    const init = async () => {
      try {
        await refreshGrid(userName)
        seteditingRights(pocketbase?.authStore?.record?.userName === userName)
        setShowMessageButtons(!(pocketbase?.authStore?.record?.userName === userName))
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName])

  const { animatedIndex } = useBackdropStore()

  const bottomSheetRef = useRef<BottomSheet>(null)
  const [index, setIndex] = useState(0)

  const { saves, addSave, removeSave } = useMessageStore()
  const { remove, moveToBacklog } = useItemStore()

  const handleMoveToBacklog = async () => {
    try {
      const updatedRecord = await moveToBacklog(
        typeof removingId === 'string' ? removingId : (removingId as string[])[0]
      )
      setRemovingId('')
      await refreshGrid(userName)
    } catch (error) {
      console.error(error)
    }
  }

  const saveId = saves.find((s) => s.expand.user.id === profile?.id)?.id

  const ownProfile = profile && profile.id === user?.id

  const disappearsOnIndex = 0
  const appearsOnIndex = 1
  const isMinimised = ownProfile && index === 0
  const HANDLE_HEIGHT = s.$2

  let { view, snapPoints } = useMemo(() => {
    if (ownProfile) {
      if (removingId) {
        return { view: 'removing', snapPoints: ['1%', '25%'] }
      } else if (addingTo === 'grid') {
        return { view: 'adding_to_grid', snapPoints: ['1%', '30%', '90%'] }
      } else if (addingTo === 'backlog') {
        return { view: 'adding_to_backlog', snapPoints: ['1%', '30%', '90%'] }
      } else {
        return { view: 'my_backlog', snapPoints: ['15%', '90%'] }
      }
    } else {
      if (openOtherUsersBacklog) {
        return { view: 'other_backlog', snapPoints: ['1%', '50%', '90%'] }
      } else {
        return { view: 'other_buttons', snapPoints: ['15%'] }
      }
    }
  }, [ownProfile, removingId, addingTo, openOtherUsersBacklog])

  return (
    <>
      <YStack
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: s.$08,
        }}
        gap={s.$4}
      >
        {profile && (
          <View
            style={{
              flex: 1,
              width: '100%',
              marginHorizontal: s.$1half,
            }}
          >
            <ProfileHeader profile={profile} />

            <View style={{ gap: s.$2 }}>
              <Grid
                editingRights={editingRights}
                onRemoveItem={(id) => {
                  setRemovingId(id)
                  bottomSheetRef.current?.snapToIndex(1)
                }}
                onAddItem={() => {
                  setAddingTo('grid')
                  bottomSheetRef.current?.snapToIndex(1)
                }}
                columns={3}
                items={gridItems}
                rows={4}
              ></Grid>
            </View>
          </View>
        )}

        {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}
      </YStack>
      {profile && (
        <BottomSheet
          enableDynamicSizing={false}
          ref={bottomSheetRef}
          enablePanDownToClose={false}
          snapPoints={snapPoints}
          index={0}
          animatedIndex={animatedIndex}
          onChange={(i: number) => {
            setIndex(i)
            if (i === 0) {
              if (addingTo) {
                setAddingTo('')
              }
              if (removingId) {
                setRemovingId('')
              }
              if (openOtherUsersBacklog) {
                setOpenOtherUsersBacklog(false)
              }
            }
          }}
          backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
          backdropComponent={(p) => (
            <BottomSheetBackdrop
              {...p}
              disappearsOnIndex={disappearsOnIndex}
              appearsOnIndex={appearsOnIndex}
              pressBehavior={ownProfile ? 'collapse' : 'close'}
            />
          )}
          handleComponent={() => (
            <View
              style={{
                width: '100%',
                position: 'absolute',
                alignItems: 'center',
                justifyContent: 'center',
                display: isMinimised ? 'none' : 'flex',
                height: HANDLE_HEIGHT,
              }}
            >
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={{
                  backgroundColor: c.white,
                  width: s.$5,
                  height: s.$05,
                  borderRadius: s.$10,
                }}
              />
            </View>
          )}
          keyboardBehavior="interactive"
        >
          {view === 'my_backlog' || view === 'other_backlog' ? (
            <>
              <Pressable
                onPress={() => {
                  if (bottomSheetRef.current && isMinimised) bottomSheetRef.current.snapToIndex(1)
                }}
                style={{
                  // handle is hidden while minimised, so this is needed to make sure
                  // the "My backlog" heading doesn't shift around when opening/closing the sheet
                  paddingTop: HANDLE_HEIGHT,
                  paddingBottom: s.$2 + s.$05,
                }}
              >
                {ownProfile ? (
                  <XStack
                    gap={s.$075}
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: s.$2,
                    }}
                  >
                    <Heading tag="h2normal" style={{ color: c.white }}>
                      My Backlog
                    </Heading>
                    <View style={{ height: 1, flex: 1, backgroundColor: c.white }}></View>
                    <Pressable
                      onPress={() => {
                        setAddingTo('backlog')
                        console.log('just clicked add to backlog')
                        console.log(index, snapPoints)
                        bottomSheetRef.current?.snapToIndex(1)
                      }}
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={s.$4} color={c.white} />
                    </Pressable>
                  </XStack>
                ) : (
                  <Heading tag="h2normal" style={{ color: c.white, paddingHorizontal: s.$2 }}>
                    {`${profile.firstName}'s Library`}
                  </Heading>
                )}
              </Pressable>
              <BacklogList items={backlogItems.toReversed()} ownProfile={profile.id === user?.id} />
            </>
          ) : view === 'other_buttons' ? (
            <XStack style={{ paddingTop: s.$2, justifyContent: 'center' }} gap={s.$1}>
              <View style={{ height: s.$4, width: s.$10 }}>
                <DMButton profile={profile} style={{ paddingHorizontal: s.$0 }} />
              </View>
              <View style={{ height: s.$4, width: s.$10 }}>
                <Button
                  onPress={saveId ? () => removeSave(saveId) : () => addSave(profile.id, user?.id!)}
                  variant="whiteOutline"
                  title={saveId ? 'Saved' : 'Save'}
                  style={saveId ? styles.saved : { paddingHorizontal: s.$0 }}
                />
              </View>

              <View style={{ height: s.$4, width: s.$10 }}>
                <Button
                  onPress={() => {
                    setOpenOtherUsersBacklog(true)
                  }}
                  variant="whiteOutline"
                  title="Backlog"
                  style={{ paddingHorizontal: s.$0 }}
                />
              </View>
            </XStack>
          ) : view === 'removing' ? (
            <>
              <YStack gap={s.$08} style={{ marginTop: s.$1, marginBottom: s.$5 }}>
                <Button
                  onPress={handleMoveToBacklog}
                  title={`Move to backlog`}
                  variant="outlineFluid"
                />
                <Button
                  onPress={async () => {
                    await removeFromProfile(
                      typeof removingId === 'string' ? removingId : (removingId as string[])[0]
                    )
                    setRemovingId('')
                    await refreshGrid(userName)
                  }}
                  title="Remove"
                  variant="fluid"
                />
              </YStack>
            </>
          ) : (
            <NewRef
              backlog={addingTo === 'backlog'}
              onStep={(step) => {
                setStep(step)
                if (step === 'add') bottomSheetRef.current?.snapToIndex(2)
              }}
              onNewRef={async (itm: Item) => {
                await refreshGrid(userName)
                bottomSheetRef.current?.collapse()
                setAddingTo('')
                refreshGrid(userName)
                if (addingTo !== 'backlog')
                  router.push(`/user/${userName}/modal?initialId=${itm.id}`)
              }}
              onCancel={() => {
                bottomSheetRef.current?.snapToIndex(0)
                setAddingTo('')
              }}
            />
          )}
        </BottomSheet>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  saved: {
    borderWidth: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    opacity: 0.5,
    paddingHorizontal: 0,
  },
})
