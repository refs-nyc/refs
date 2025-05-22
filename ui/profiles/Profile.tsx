import type { Item } from '@/features/pocketbase/stores/types'
import { YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { Heading } from '../typo/Heading'
import { NewRef } from '../actions/NewRef'
import { useUIStore } from '../state'
import { ProfileHeader } from './ProfileHeader'
import { Grid } from '../grid/Grid'
import { Sheet } from '../core/Sheets'
import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState, useRef } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { s, c } from '@/features/style'
import { pocketbase, useUserStore, removeFromProfile, useItemStore } from '@/features/pocketbase'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import {
  Profile as ProfileType,
  ExpandedProfile,
  ExpandedItem,
} from '@/features/pocketbase/stores/types'
import { DMButton } from './DMButton'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import BacklogBottomSheet from './BacklogBottomSheet'
import BacklogList from './BacklogList'
import BottomSheet from '@gorhom/bottom-sheet'

export const Profile = ({ userName }: { userName: string }) => {
  const { addingTo, removingId } = useLocalSearchParams()
  const { stopEditProfile } = useUIStore()
  const { getProfileItems, getBacklogItems } = useItemStore()
  const { hasShareIntent } = useShareIntentContext()
  const { saves, addSave } = useMessageStore()

  const [profile, setProfile] = useState<ProfileType>()
  const [gridItems, setGridItems] = useState<Item[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [editingRights, seteditingRights] = useState<boolean>(false)
  const [showMessageButtons, setShowMessageButtons] = useState<boolean>(false)
  const [step, setStep] = useState('')

  const backlogSheetRef = useRef<BottomSheet>(null)

  const { user } = useUserStore()
  const { remove, moveToBacklog } = useItemStore()

  const inSaves = profile && saves.map((s) => s.expand.user.id).includes(profile.id)

  const setAddingTo = (str: string) => {
    router.setParams({ addingTo: str })
  }
  const setRemovingId = (str: string) => {
    router.setParams({ removingId: str })
  }

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

  const refreshGrid = async (userName: string) => {
    try {
      const profile = await pocketbase
        .collection<ProfileType>('users')
        .getFirstListItem<ProfileType>(`userName = "${userName}"`)
      setProfile(profile)

      const gridItems = await getProfileItems(userName)
      console.log(JSON.stringify(gridItems))
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
                onRemoveItem={setRemovingId}
                onAddItem={() => {
                  setAddingTo('grid')
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

      {profile && showMessageButtons && (
        <Pressable onPress={() => stopEditProfile()}>
          <View
            style={{
              borderRadius: s.$5,
              backgroundColor: c.olive,
              paddingTop: s.$1,
              paddingHorizontal: s.$2,
              height: s.$10,
              position: 'absolute',
              bottom: s.$0,
              left: -s.$05,
              right: -s.$05,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ height: s.$4, width: s.$10 }}>
              <DMButton profile={profile} style={{ paddingHorizontal: s.$0 }} />
            </View>
            <View style={{ height: s.$4, width: s.$10 }}>
              <Button
                onPress={() => {
                  addSave(profile.id, user?.id!)
                }}
                variant="whiteOutline"
                disabled={inSaves}
                title={inSaves ? 'Saved' : 'Save'}
                style={inSaves ? styles.saved : { paddingHorizontal: s.$0 }}
              />
            </View>

            <View style={{ height: s.$4, width: s.$10 }}>
              <Button
                onPress={() => {
                  backlogSheetRef.current?.snapToIndex(0)
                }}
                variant="whiteOutline"
                title="Backlog"
                style={{ paddingHorizontal: s.$0 }}
              />
            </View>
          </View>
        </Pressable>
      )}

      {profile && (
        <BacklogBottomSheet
          backlogSheetRef={backlogSheetRef}
          onAddToBacklogClick={() => {
            setAddingTo('backlog')
          }}
          profile={profile}
        >
          <BacklogList items={backlogItems.toReversed()} />
        </BacklogBottomSheet>
      )}

      {removingId && (
        <Sheet full={false} onChange={(e: any) => e === -1 && setRemovingId('')}>
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
        </Sheet>
      )}

      {(addingTo === 'grid' || addingTo === 'backlog') && (
        <Sheet
          noPadding={true}
          full={step !== ''}
          onChange={(e: any) => e === -1 && setAddingTo('')}
          backgroundStyle={{
            backgroundColor: c.olive,
          }}
          handleIndicatorStyle={{ width: s.$10, backgroundColor: c.white, opacity: 0.5 }}
        >
          <NewRef
            backlog={addingTo === 'backlog'}
            onStep={setStep}
            onNewRef={async (itm: Item) => {
              await refreshGrid(userName)
              setAddingTo('')
              if (addingTo !== 'backlog') router.push(`/user/${userName}/modal?initialId=${itm.id}`)
            }}
            onCancel={() => {
              setAddingTo('')
            }}
          />
        </Sheet>
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
