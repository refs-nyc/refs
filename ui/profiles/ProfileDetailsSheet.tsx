import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { ProfileDetailsProvider } from './profileDetailsStore'
import { Details } from './Details'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { useCallback } from 'react'
import { ExpandedItem, ExpandedProfile } from '@/features/pocketbase/stores/types'
import { c } from '@/features/style'

export const ProfileDetailsSheet = ({
  onChange,
  detailsSheetRef,
  editingRights,
  detailsItemId,
  profile,
  gridItems,
}: {
  editingRights: boolean
  detailsItemId: string
  profile: ExpandedProfile
  gridItems: ExpandedItem[]
  onChange: (index: number) => void
  detailsSheetRef: React.RefObject<BottomSheet>
}) => {
  const snapPoints = ['100%']

  const { detailsBackdropAnimatedIndex } = useBackdropStore()

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
      <ProfileDetailsProvider
        editingRights={editingRights}
        initialIndex={initialIndex}
        openedFromFeed={false}
      >
        <Details profile={profile} data={gridItems} />
      </ProfileDetailsProvider>
    </BottomSheet>
  )
}
