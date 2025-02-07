import { useMemo, useEffect, useCallback, useState } from 'react'
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { c, s } from '@/features/style'
import { useAnimatedKeyboard, useDerivedValue } from 'react-native-reanimated'
import { Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const win = Dimensions.get('window')

export const Sheet = (props: any = { full: false }) => {
  const keyboard = useAnimatedKeyboard()
  const insets = useSafeAreaInsets()

  // Render backdrop remains unchanged
  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  // Now use keyboardHeight from state in the calculation
  const maxDynamicContentSize = useDerivedValue(() => {
    const calculatedSize = win.height - keyboard.height.value - insets.top
    return calculatedSize
  })

  const snapPoints = useDerivedValue(() => [maxDynamicContentSize.value], [maxDynamicContentSize])
  return (
    <BottomSheet
      {...props}
      backgroundStyle={{
        backgroundColor: c.surface,
      }}
      style={{ paddingHorizontal: s.$2 }}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={!props?.full}
      snapPoints={snapPoints}
      maxDynamicContentSize={maxDynamicContentSize.value}
      handleIndicatorStyle={{ width: s.$10, backgroundColor: c.muted }}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      onChange={props?.onChange}
    >
      <BottomSheetView>{props?.children}</BottomSheetView>
    </BottomSheet>
  )
}
