import { c, s } from '@/features/style'

import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { magic } from '@/features/magic'
import { useAppStore } from '../stores'
import { createRef, useEffect } from 'react'

export const MagicSheet = ({}: // bottomSheetRef,
{
  // bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const bottomSheetRef = createRef<BottomSheet>()
  const { showMagicSheet } = useAppStore()
  const disappearsOnIndex = -1
  const appearsOnIndex = 0

  useEffect(() => {
    if (showMagicSheet) {
      console.log('opening sheet...')
      bottomSheetRef.current?.expand()
    } else {
      console.log('closing sheet...')
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
      onChange={(i: number) => {
        console.log(`magic sheet position: ${i}`)
        // if (i === -1) {
        // setMagicPhoneNumber(null)
        // setShowMagicSheet(false)
        // }
      }}
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
