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
import { simpleCache } from '@/features/cache/simpleCache'

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
    addingRefId,
    referencersContext,
  } = useAppStore()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [gridItems, setGridItems] = useState<ExpandedItem[]>([])

  // Use preloaded data for smooth animation, fallback to fetching if needed
  useEffect(() => {
    const initializeData = async () => {
      if (!detailsProfileUsername) {
        setProfile(null)
        setGridItems([])
        return
      }
      try {
        const fetchedProfile = await getUserByUserName(detailsProfileUsername)
        const fetchedItems = await getProfileItems({
          userName: detailsProfileUsername,
          userId: fetchedProfile.id,
          forceNetwork: true,
        })
        setProfile(fetchedProfile)
        setGridItems(fetchedItems)
        const profileWithUserId = { ...fetchedProfile, _cachedUserId: fetchedProfile.id }
        Promise.all([
          simpleCache.set('profile', profileWithUserId, fetchedProfile.id),
          simpleCache.set('grid_items', fetchedItems, fetchedProfile.id),
        ]).catch((error) => {
          console.warn('ProfileDetailsSheet cache sync failed', error)
        })
      } catch (error) {
        console.warn('Failed to load profile details', error)
      }
    }
    initializeData()
  }, [detailsProfileUsername, user?.userName, getUserByUserName])

  // if the current user is the item creator, then they have editing rights
  const editingRights = profile?.id === user?.id

  const snapPoints = ['77%', '100%']

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

  const sheetZIndex = addingRefId || referencersContext ? 100 : 9000

  return (
    <BottomSheet
      ref={detailsSheetRef}
      index={-1}
      style={{ zIndex: sheetZIndex }}
      containerStyle={{ zIndex: sheetZIndex }}
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
      keyboardBehavior="fillParent"
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
