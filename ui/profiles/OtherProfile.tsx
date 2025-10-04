import { useAppStore } from '@/features/stores'
import type { Profile } from '@/features/types'
import { ExpandedItem } from '@/features/types'
import { s } from '@/features/style'
import BottomSheet from '@gorhom/bottom-sheet'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Grid } from '../grid/Grid'
import { PlaceholderGrid } from '../grid/PlaceholderGrid'
import { Heading } from '../typo/Heading'
import { ProfileDetailsSheet } from './ProfileDetailsSheet'
import { ProfileHeader } from './ProfileHeader'
import { bootStep } from '@/features/debug/bootMetrics'
import { OtherBacklogSheet } from './sheets/OtherBacklogSheet'
import { OtherButtonsSheet } from './sheets/OtherButtonsSheet'
import AsyncStorage from '@react-native-async-storage/async-storage'

const profileIdLookup = new Map<string, string>()

export const OtherProfile = ({ userName, prefetchedUserId }: { userName: string; prefetchedUserId?: string }) => {
  const [profile, setProfile] = useState<Profile>()
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const [backlogItems, setBacklogItems] = useState<ExpandedItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const { user, stopEditing } = useAppStore()
  const liveProfileBundle = useAppStore((state) => state.profileBundles[userName])

  useEffect(() => {
    if (prefetchedUserId) {
      profileIdLookup.set(userName, prefetchedUserId)
    }
  }, [prefetchedUserId, userName])

  const refreshGrid = async (userName: string) => {
    setLoading(true)
    try {
      bootStep(`otherProfile.${userName}.refresh.start`)
      const storeState = useAppStore.getState()
      const existingBundle = storeState.profileBundles[userName]
      if (existingBundle) {
        setProfile(existingBundle.profile)
        setGridItems(existingBundle.gridItems)
        setBacklogItems(existingBundle.backlogItems)
        setLoading(false)
      }

      const bundle = await storeState.getProfileBundle(userName)
      bootStep(`otherProfile.${userName}.refresh.end`)
      setProfile(bundle.profile)
      setGridItems(bundle.gridItems)
      setBacklogItems(bundle.backlogItems)
      setLoading(false)
      profileIdLookup.set(userName, bundle.profile.id)
      await AsyncStorage.setItem(
        `simple_cache_profile_lookup_${userName}`,
        JSON.stringify({ userId: bundle.profile.id })
      )
    } catch (error) {
      console.error('Failed to refresh other profile:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        // Only run heavy database operations when component is active
        await refreshGrid(userName)
      } catch (error) {
        console.error(error)
      }
    }
    init()
  }, [userName, prefetchedUserId]) // Removed isActiveTab dependency

  const bottomSheetRef = useRef<BottomSheet>(null)
  const detailsSheetRef = useRef<BottomSheet>(null)
  const backlogSheetRef = useRef<BottomSheet>(null)

  const [detailsItem, setDetailsItem] = useState<ExpandedItem | null>(null)

  useEffect(() => {
    if (!liveProfileBundle) return
    const nextBacklog = liveProfileBundle.backlogItems
    const sameLength = nextBacklog.length === backlogItems.length
    const sameContent =
      sameLength &&
      nextBacklog.every((item, index) => backlogItems[index]?.id === item.id)

    if (!sameContent) {
      bootStep(`otherProfile.${userName}.backlog.update`)
      setBacklogItems(nextBacklog)
    }
  }, [liveProfileBundle, backlogItems])

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
                  editingRights={false}
                  onPressItem={(item) => {
                    setDetailsItem(item!)
                    detailsSheetRef.current?.snapToIndex(0)
                  }}
                  isOffscreen={false} // OtherProfile is always visible when mounted
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
