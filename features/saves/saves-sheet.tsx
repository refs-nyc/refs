import SavesList from '@/features/messaging/saves'
import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useCallback } from 'react'

export default function Saves({
  savesBottomSheetRef,
}: {
  savesBottomSheetRef: React.RefObject<BottomSheet>
}) {
  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  return (
    <BottomSheet
      ref={savesBottomSheetRef}
      index={-1}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      snapPoints={['80%']}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50 }}
      handleComponent={null}
      // handleIndicatorStyle={{ width: s.$13, height: s.$075, backgroundColor: c.white }}
    >
      <SavesList />
    </BottomSheet>
  )
}
