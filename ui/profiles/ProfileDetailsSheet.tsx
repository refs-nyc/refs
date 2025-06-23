import { pocketbase, useUserStore } from '@/features/pocketbase'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { getProfileItems, useItemStore } from '@/features/pocketbase/stores/items'
import { ExpandedItem, ExpandedProfile } from '@/features/pocketbase/stores/types'
import { c } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useState } from 'react'
import { Details } from './Details'
import { ProfileDetailsProvider } from './profileDetailsStore'

export const ProfileDetailsSheet = ({
  onChange,
  detailsSheetRef,
  profileUsername,
  detailsItemId,
  openedFromFeed,
}: {
  profileUsername: string
  detailsItemId: string
  onChange: (index: number) => void
  detailsSheetRef: React.RefObject<BottomSheet>
  openedFromFeed: boolean
}) => {
  const [profile, setProfile] = useState<ExpandedProfile | null>(null)
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const { profileRefreshTrigger } = useItemStore()

  useEffect(() => {
    const fetchProfile = async () => {
      const profile = await pocketbase
        .collection('users')
        .getFirstListItem<ExpandedProfile>(`userName = "${profileUsername}"`)
      const gridItems = await getProfileItems(profile.userName)

      setProfile(profile)
      setGridItems(gridItems)
    }
    fetchProfile()
  }, [profileUsername, profileRefreshTrigger])

  // get current user
  const { user } = useUserStore()
  // if the current user is the item creator, then they have editing rights
  const editingRights = profile?.id === user?.id

  const snapPoints = ['100%']

  const { detailsBackdropAnimatedIndex, registerBackdropPress, unregisterBackdropPress } =
    useBackdropStore()

  useEffect(() => {
    const key = registerBackdropPress(() => {
      detailsSheetRef.current?.close()
    })
    return () => {
      unregisterBackdropPress(key)
    }
  }, [])

  // Render backdrop remains unchanged
  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  const initialIndex = Math.max(
    0,
    gridItems.findIndex((itm) => itm.id === detailsItemId)
  )

  return (
    <BottomSheet
      ref={detailsSheetRef}
      backgroundStyle={{
        backgroundColor: c.surface,
        padding: 0,
      }}
      animatedIndex={detailsBackdropAnimatedIndex}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      enableDynamicSizing={false}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      onChange={onChange}
    >
      {profile && gridItems.length > 0 && (
        <ProfileDetailsProvider
          editingRights={editingRights}
          initialIndex={initialIndex}
          openedFromFeed={openedFromFeed}
        >
          <Details data={gridItems} />
        </ProfileDetailsProvider>
      )}
    </BottomSheet>
  )
}
