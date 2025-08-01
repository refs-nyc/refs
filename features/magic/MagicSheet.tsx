import { c } from '@/features/style'

import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { magic } from '@/features/magic'
import { useAppStore } from '../stores'
import { createRef, useEffect } from 'react'

export const MagicSheet = () => {
  const bottomSheetRef = createRef<BottomSheet>()
  const { showMagicSheet } = useAppStore()
  const disappearsOnIndex = -1
  const appearsOnIndex = 0

  useEffect(() => {
    if (showMagicSheet) {
      bottomSheetRef.current?.expand()
    } else {
      bottomSheetRef.current?.close()
    }
  }, [showMagicSheet])

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={['90%']}
      index={-1}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      handleComponent={null}
      keyboardBehavior="interactive"
    >
      <magic.Relayer />
    </BottomSheet>
  )
}
