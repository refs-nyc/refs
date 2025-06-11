import { pocketbase, removeFromProfile, useItemStore, useUserStore } from '@/features/pocketbase'
import { getBacklogItems, getProfileItems } from '@/features/pocketbase/stores/items'
import type { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { s } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { router, useLocalSearchParams } from 'expo-router'
import { useShareIntentContext } from 'expo-share-intent'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Button } from '../buttons/Button'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { useUIStore } from '../state'
import { Heading } from '../typo/Heading'
import { ProfileBottomSheet } from './ProfileBottomSheet'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { ProfileHeader } from './ProfileHeader'

export const Profile = ({ userName }: { userName: string }) => {
  const { hasShareIntent } = useShareIntentContext()
  const { startEditProfile, stopEditProfile } = useUIStore()

  const [profile, setProfile] = useState<ExpandedProfile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [editingRights, seteditingRights] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  const { user } = useUserStore()
  const { moveToBacklog, profileRefreshTrigger } = useItemStore()
  const { addingTo, removingId } = useLocalSearchParams()

  const setAddingTo = (str: string) => {
    router.setParams({ addingTo: str })
  }
  const setRemovingId = (str: string) => {
    router.setParams({ removingId: str })
  }

  const refreshGrid = async (userName: string) => {
    setLoading(true)
    try {
      const profile = await pocketbase
        .collection('users')
        .getFirstListItem<ExpandedProfile>(`userName = "${userName}"`)
      setProfile(profile)

      const gridItems = await getProfileItems(userName)
      setGridItems(gridItems)

      const backlogItems = await getBacklogItems(userName)
      setBacklogItems(backlogItems as ExpandedItem[])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
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

  const handleRemoveFromProfile = async () => {
    await removeFromProfile(
      typeof removingId === 'string' ? removingId : (removingId as string[])[0]
    )
    setRemovingId('')
    await refreshGrid(userName)
  }

  const handleCreateNewRef = async (item: ExpandedItem) => {
    await refreshGrid(userName)
    bottomSheetRef.current?.collapse()
    setAddingTo('')
    await refreshGrid(userName)
    if (addingTo !== 'backlog') {
      setDetailsItem(item)
      detailsSheetRef.current?.snapToIndex(0)
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
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName, profileRefreshTrigger])

  const { logout } = useUserStore()

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)

  const ownProfile = profile && profile.id === user?.id

  const stopEditing = useItemStore((state) => state.stopEditing)

  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)

  // timeout used to stop editing the profile after 10 seconds
  let timeout: ReturnType<typeof setTimeout>

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: s.$08,
          paddingBottom: s.$10,
          gap: s.$4,
          minHeight: '100%',
        }}
        showsVerticalScrollIndicator={false}
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
              {loading ? (
                <PlaceholderGrid columns={3} rows={4} />
              ) : (
                <Grid
                  editingRights={editingRights}
                  onPressItem={(item) => {
                    setDetailsItem(item!)
                    detailsSheetRef.current?.snapToIndex(0)
                  }}
                  onLongPressItem={() => {
                    if (editingRights) {
                      clearTimeout(timeout)
                      timeout = setTimeout(() => {
                        stopEditProfile()
                      }, 10000)
                      startEditProfile()
                    }
                  }}
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
                />
              )}
              {ownProfile && (
                <View style={{ marginBottom: s.$2, alignItems: 'center' }}>
                  <Button
                    style={{ width: 20 }}
                    variant="inlineSmallMuted"
                    title="Log out"
                    onPress={logout}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}
      </ScrollView>
      {profile && (
        <>
          <ProfileBottomSheet
            bottomSheetRef={bottomSheetRef}
            backlogItems={backlogItems}
            profile={profile}
            user={user}
            handleMoveToBacklog={handleMoveToBacklog}
            handleRemoveFromProfile={handleRemoveFromProfile}
            handleCreateNewRef={handleCreateNewRef}
          />
          {detailsItem && (
            <ProfileDetailsSheet
              profileUsername={profile.userName}
              detailsItemId={detailsItem.id}
              onChange={(index: number) => {
                if (index === -1) {
                  stopEditing()
                  setDetailsItem(null)
                }
              }}
              openedFromFeed={false}
              detailsSheetRef={detailsSheetRef}
            />
          )}
        </>
      )}
    </>
  )
}
