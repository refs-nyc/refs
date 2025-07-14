import { pocketbase, useAppStore } from '@/features/pocketbase'
import { getBacklogItems, getProfileItems } from '@/features/pocketbase/stores/items'
import type { ExpandedProfile } from '@/features/pocketbase/stores/types'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { s } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { ProfileHeader } from './ProfileHeader'
import { OtherBacklogSheet } from './sheets/OtherBacklogSheet'
import { OtherButtonsSheet } from './sheets/OtherButtonsSheet'

export const OtherProfile = ({ userName }: { userName: string }) => {
  const [profile, setProfile] = useState<ExpandedProfile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const { profileRefreshTrigger, user, stopEditing } = useAppStore()

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

  useEffect(() => {
    const init = async () => {
      try {
        await refreshGrid(userName)
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName, profileRefreshTrigger])

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const backlogSheetRef = useRef<BottomSheet>(null)

  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)

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
                  columns={3}
                  items={gridItems}
                  rows={4}
                  onPressItem={(item) => {
                    setDetailsItem(item!)
                    detailsSheetRef.current?.snapToIndex(0)
                  }}
                />
              )}
            </View>
          </View>
        )}

        {!user && <Heading tag="h1">Profile for {userName} not found</Heading>}
      </ScrollView>
      {profile && (
        <>
          <OtherButtonsSheet
            bottomSheetRef={bottomSheetRef}
            profile={profile}
            user={user}
            openBacklogSheet={() => {
              backlogSheetRef.current?.snapToIndex(0)
            }}
          />
          <OtherBacklogSheet
            bottomSheetRef={backlogSheetRef}
            backlogItems={backlogItems}
            profile={profile}
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
