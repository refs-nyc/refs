import { pocketbase, useAppStore } from '@/features/pocketbase'
import { getBacklogItems, getProfileItems } from '@/features/pocketbase/stores/items'
import type { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { s } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { useShareIntentContext } from 'expo-share-intent'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Button } from '../buttons/Button'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { useUIStore } from '../state'
import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { ProfileHeader } from './ProfileHeader'
import { MyBacklogSheet } from './sheets/MyBacklogSheet'
import { RemoveRefSheet } from './sheets/RemoveRefSheet'

export const MyProfile = ({ userName }: { userName: string }) => {
  const { hasShareIntent } = useShareIntentContext()
  const { startEditProfile, stopEditProfile, setAddingNewRefTo, addingNewRefTo, newRefSheetRef } =
    useUIStore()

  const [profile, setProfile] = useState<ExpandedProfile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [editingRights, seteditingRights] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  const { user, moveToBacklog, profileRefreshTrigger, removeItem } = useAppStore()

  const [removingItem, setRemovingItem] = useState<ExpandedItem | null>(null)

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
    if (!removingItem) return
    try {
      removeRefSheetRef.current?.close()
      const updatedRecord = await moveToBacklog(removingItem?.id)
      setRemovingItem(null)
      await refreshGrid(userName)
    } catch (error) {
      console.error(error)
    }
  }

  const handleRemoveFromProfile = async () => {
    if (!removingItem) return
    removeRefSheetRef.current?.close()
    await removeItem(removingItem.id)
    setRemovingItem(null)
    await refreshGrid(userName)
  }

  useEffect(() => {
    if (hasShareIntent) {
      setAddingNewRefTo(gridItems.length < 12 ? 'grid' : 'backlog')
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

  const { logout, stopEditing } = useAppStore()

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const removeRefSheetRef = useRef<BottomSheet>(null)

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
                  onRemoveItem={(item) => {
                    setRemovingItem(item)
                    removeRefSheetRef.current?.expand()
                  }}
                  onAddItem={(prompt?: string) => {
                    setAddingNewRefTo('grid')
                    if (prompt) useUIStore.getState().setAddRefPrompt(prompt)
                    newRefSheetRef.current?.snapToIndex(1)
                  }}
                  onAddItemWithPrompt={(prompt: string) => {
                    setAddingNewRefTo('grid')
                    useUIStore.getState().setAddRefPrompt(prompt)
                    newRefSheetRef.current?.snapToIndex(1)
                  }}
                  columns={3}
                  items={gridItems}
                  rows={4}
                />
              )}

              <View style={{ marginBottom: s.$2, alignItems: 'center' }}>
                <Button
                  style={{ width: 20 }}
                  variant="inlineSmallMuted"
                  title="Log out"
                  onPress={logout}
                />
              </View>
            </View>
          </View>
        )}

        {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}
      </ScrollView>
      {profile && (
        <>
          <MyBacklogSheet
            backlogItems={backlogItems}
            profile={profile}
            user={user}
            openAddtoBacklog={() => {
              setAddingNewRefTo('backlog')
              newRefSheetRef.current?.snapToIndex(1)
            }}
          />
          <RemoveRefSheet
            bottomSheetRef={removeRefSheetRef}
            handleMoveToBacklog={handleMoveToBacklog}
            handleRemoveFromProfile={handleRemoveFromProfile}
            item={removingItem}
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
