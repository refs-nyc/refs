import SavesList from '@/features/messaging/saves'
import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { router } from 'expo-router'
import { useCallback } from 'react'

export default function Saves() {
  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  return (
    <BottomSheet
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      snapPoints={['80%']}
      onChange={(i: number) => {
        if (i === -1) router.dismiss()
      }}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4 }}
      handleIndicatorStyle={{ width: s.$13, height: s.$075, backgroundColor: c.white }}
    >
      <SavesList />
    </BottomSheet>
  )
}
