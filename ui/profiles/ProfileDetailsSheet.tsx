import { useAppStore } from '@/features/stores'
import { ExpandedItem, Profile } from '@/features/types'
import { c } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useState } from 'react'
import { Details } from './Details'
import { ProfileDetailsProvider } from './profileDetailsStore'
import { GridLines } from '../display/Gridlines'
import React from 'react'
import { View } from 'react-native'

// --- Helper Components for State Isolation ---

const ConditionalGridLines = React.memo(() => {
  const editing = useAppStore((state) => state.editing)
  if (editing === '') {
    return null
  }
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        borderRadius: 50,
        overflow: 'hidden',
      }}
    >
      <GridLines lineColor={c.grey1} size={20} />
    </View>
  )
})
ConditionalGridLines.displayName = 'ConditionalGridLines'

export const ProfileDetailsSheet = ({
  onChange,
  detailsSheetRef,
  profile,
  detailsItemId,
  openedFromFeed,
}: {
  profile: Profile
  detailsItemId: string
  onChange: (index: number) => void
  detailsSheetRef: React.RefObject<BottomSheet>
  openedFromFeed: boolean
}) => {
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const {
    profileRefreshTrigger,
    user,
    detailsBackdropAnimatedIndex,
    registerBackdropPress,
    unregisterBackdropPress,
    getProfileItems,
  } = useAppStore()

  // Use preloaded data for smooth animation, fallback to fetching if needed
  useEffect(() => {
    const fetchProfile = async () => {
      const gridItems = await getProfileItems(profile)

      setGridItems(gridItems)
    }
    fetchProfile()
  }, [profile, profileRefreshTrigger])

  // if the current user is the item creator, then they have editing rights
  const editingRights = profile?.did === user?.did

  const snapPoints = ['100%']

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
        borderRadius: 50,
        padding: 0,
        overflow: 'hidden',
      }}
      animatedIndex={detailsBackdropAnimatedIndex}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      enableDynamicSizing={false}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      onChange={onChange}
      // animationDuration={300}
      enableOverDrag={false}
    >
      <ConditionalGridLines />
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
