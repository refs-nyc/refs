import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { UsersRecord } from '@/features/pocketbase/stores/pocketbase-types'
import type { ExpandedItem, ExpandedProfile, Item } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { NewRef } from '@/ui/actions/NewRef'
import { Button } from '@/ui/buttons/Button'
import { XStack, YStack } from '@/ui/core/Stacks'
import BacklogList from '@/ui/profiles/BacklogList'
import { DMButton } from '@/ui/profiles/DMButton'
import { Heading } from '@/ui/typo/Heading'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const ProfileBottomSheet = ({
  bottomSheetRef,
  backlogItems,
  profile,
  user,
  handleMoveToBacklog,
  handleRemoveFromProfile,
  handleCreateNewRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
  backlogItems: ExpandedItem[]
  profile: ExpandedProfile
  user: UsersRecord | null
  handleMoveToBacklog: () => Promise<void>
  handleRemoveFromProfile: () => Promise<void>
  handleCreateNewRef: (itm: Item) => Promise<void>
}) => {
  const setAddingTo = (str: string) => {
    router.setParams({ addingTo: str })
  }
  const setRemovingId = (str: string) => {
    router.setParams({ removingId: str })
  }

  const { addingTo, removingId } = useLocalSearchParams()

  const { moduleBackdropAnimatedIndex } = useBackdropStore()
  const [index, setIndex] = useState(0)

  const { saves, addSave, removeSave } = useMessageStore()

  const [openOtherUsersBacklog, setOpenOtherUsersBacklog] = useState(false)

  const ownProfile = profile && profile.id === user?.id

  const [step, setStep] = useState('')

  // useEffect(() => {
  let view: string = ''
  let snapPoints: string[] = []
  if (ownProfile) {
    if (removingId) {
      view = 'removing'
      snapPoints = ['1%', '25%']
    } else if (addingTo === 'grid') {
      view = 'adding_to_grid'
      snapPoints = ['1%', '30%', '90%']
    } else if (addingTo === 'backlog') {
      view = 'adding_to_backlog'
      snapPoints = ['1%', '30%', '90%']
    } else {
      view = 'my_backlog'
      snapPoints = ['15%', '90%']
    }
  } else {
    if (openOtherUsersBacklog) {
      view = 'other_backlog'
      snapPoints = ['1%', '50%', '90%']
    } else {
      view = 'other_buttons'
      snapPoints = ['15%']
    }
  }
  // }, [ownProfile, removingId, addingTo, openOtherUsersBacklog])

  const saveId = saves.find((s) => s.expand.user.id === profile?.id)?.id
  const disappearsOnIndex = 0
  const appearsOnIndex = 1
  const isMinimised = ownProfile && index === 0
  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={false}
      snapPoints={snapPoints}
      index={0}
      animatedIndex={moduleBackdropAnimatedIndex}
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
            setTimeout(() => {
              bottomSheetRef.current?.snapToIndex(0)
            }, 50)
          }
        } else if (i === -1) {
          setTimeout(() => {
            bottomSheetRef.current?.snapToIndex(0)
          }, 50)
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
      handleComponent={() =>
        ownProfile ? (
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
        ) : null
      }
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
                {`${profile.firstName}'s Backlog`}
              </Heading>
            )}
          </Pressable>
          <BacklogList items={backlogItems.toReversed()} ownProfile={profile.id === user?.id} />
        </>
      ) : view === 'other_buttons' ? (
        <XStack style={{ paddingTop: s.$2, justifyContent: 'center' }} gap={12}>
          <View style={{ height: s.$4, width: s.$10 }}>
            <DMButton profile={profile} style={{ paddingHorizontal: s.$0 }} />
          </View>
          <View style={{ height: s.$4, width: s.$10 }}>
            <Pressable
              onPress={saveId ? () => removeSave(saveId) : () => addSave(profile.id, user?.id!)}
              style={[
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: s.$4,
                  paddingVertical: 10,
                  paddingHorizontal: s.$2,
                  minWidth: s.$8,
                  borderColor: c.white,
                  borderWidth: 1,
                  backgroundColor: 'transparent',
                  height: 47,
                },
                saveId ? styles.saved : {},
              ]}
            >
              <Heading
                tag="h3"
                style={{
                  color: c.white,
                }}
              >
                <Text style={{ fontSize: 16.5 }}>{saveId ? 'Saved' : 'Save'}</Text>
              </Heading>
            </Pressable>
          </View>

          <View style={{ height: s.$4, width: s.$10 }}>
            <Button
              onPress={() => {
                setOpenOtherUsersBacklog(true)
                setTimeout(() => {
                  bottomSheetRef.current?.snapToIndex(1)
                }, 250)
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
            <Button onPress={handleRemoveFromProfile} title="Remove" variant="fluid" />
          </YStack>
        </>
      ) : (
        <NewRef
          backlog={addingTo === 'backlog'}
          onStep={(step) => {
            setStep(step)
            if (step === 'add') bottomSheetRef.current?.snapToIndex(2)
          }}
          onNewRef={handleCreateNewRef}
          onCancel={() => {
            bottomSheetRef.current?.snapToIndex(0)
            setAddingTo('')
          }}
        />
      )}
    </BottomSheet>
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
