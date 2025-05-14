import type { Item } from '@/features/pocketbase/stores/types'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack, YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { Heading } from '../typo/Heading'
import { NewRef } from '../actions/NewRef'
import { useUIStore } from '../state'
import { ProfileHeader } from './ProfileHeader'
import { Grid } from '../grid/Grid'
import { Sheet } from '../core/Sheets'
import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState, useMemo, useRef } from 'react'
import { View, Dimensions, Pressable, Text } from 'react-native'
import { s, c } from '@/features/style'
import { pocketbase, useUserStore, removeFromProfile, useItemStore } from '@/features/pocketbase'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import {
  Profile as ProfileType,
  ExpandedProfile,
  ExpandedItem,
} from '@/features/pocketbase/stores/types'
import { gridSort, createdSort } from '../profiles/sorts'
import { DMButton } from './DMButton'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import BacklogBottomSheet from './BacklogBottomSheet'
import BacklogList from './BacklogList'
import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'

export const Profile = ({ userName }: { userName: string }) => {
  const { addingTo, removingId } = useLocalSearchParams()
  const { stopEditProfile, stopEditBacklog, startEditBacklog } = useUIStore()
  const { hasShareIntent } = useShareIntentContext()
  const { addSave } = useMessageStore()

  const [profile, setProfile] = useState<ProfileType>()
  const [gridItems, setGridItems] = useState<Item[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [editingRights, seteditingRights] = useState<boolean>(false)
  const [showMessageButtons, setShowMessageButtons] = useState<boolean>(false)
  const [step, setStep] = useState('')
  const [allItems, setAllItems] = useState<ExpandedItem[]>([])

  const backlogSheetRef = useRef<BottomSheet>(null)

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
    const all = [...backlogItems, ...gridItems] as ExpandedItem[]
    setAllItems(all)
  }, [backlogItems, gridItems])

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
      <XStack
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: s.$075,
          paddingHorizontal: s.$1,
        }}
      >
        {/* back button */}
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={s.$2} color={'#B6B5B2'} />
        </Pressable>

        {/* share button */}
        <Pressable onPress={() => {}}>
          <Heading tag="psemi" style={{ color: '#B6B5B2' }}>
            Share
          </Heading>
        </Pressable>
      </XStack>
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
            <ProfileHeader
              profile={profile}
              onPress={() => {
                stopEditProfile()
                setResults(allItems)
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
                title="Save"
                style={{ paddingHorizontal: s.$0 }}
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
        >
          <NewRef
            backlog={addingTo === 'backlog'}
            onStep={setStep}
            onNewRef={async (itm: Item) => {
              await refreshGrid(userName)
              if (itm?.list) router.push(`/user/${userName}/modal?initialId=${itm.id}`)
              setAddingTo('')
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
