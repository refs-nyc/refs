import { useAppStore } from '@/features/stores'
import { getProfileItems } from '@/features/stores/items'
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
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: -1,
      borderRadius: 50,
      overflow: 'hidden',
    }}>
      <GridLines lineColor={c.grey1} size={20} />
    </View>
  )
})
ConditionalGridLines.displayName = 'ConditionalGridLines'

export const ProfileDetailsSheet = () => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])
  const {
    user,
    detailsSheetRef,
    detailsItemId,
    detailsProfileUsername,
    detailsOpenedFromFeed,
    clearDetailsSheetData,
    detailsBackdropAnimatedIndex,
    registerBackdropPress,
    unregisterBackdropPress,
    getUserByUserName,
  } = useAppStore()

  // Use preloaded data for smooth animation, fallback to fetching if needed
  useEffect(() => {
    const initializeData = async () => {
      if (!detailsProfileUsername) {
        setProfile(null)
        setGridItems([])
        return
      }
      // Fetch data
      const profile = await getUserByUserName(detailsProfileUsername)
      const gridItems = await getProfileItems(profile.userName)
      setProfile(profile)
      setGridItems(gridItems)
    }
    initializeData()
  }, [detailsProfileUsername, user?.userName])

  // if the current user is the item creator, then they have editing rights
  const editingRights = profile?.id === user?.id

  const snapPoints = ['70%', '100%']

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

  const handleChange = useCallback((index: number) => {
    if (index === -1) {
      clearDetailsSheetData()
    }
  }, [clearDetailsSheetData])

  return (
    <BottomSheet
      ref={detailsSheetRef}
      index={-1}
      backgroundStyle={{
        backgroundColor: c.surface,
        borderRadius: 50,
        padding: 0,
        overflow: 'hidden',
      }}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      enableDynamicSizing={false}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      onChange={handleChange}
      // animationDuration={300}
      enableOverDrag={false}
    >
      <ConditionalGridLines />
      {profile && gridItems.length > 0 && detailsItemId && (
        <ProfileDetailsProvider
          editingRights={editingRights}
          initialIndex={initialIndex}
          openedFromFeed={detailsOpenedFromFeed}
        >
          <Details data={gridItems} />
        </ProfileDetailsProvider>
      )}
    </BottomSheet>
  )
}
