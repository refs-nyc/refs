import { useMemo, useEffect, useCallback, useState } from 'react'
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { c, s } from '@/features/style'
import { useAnimatedKeyboard, useDerivedValue } from 'react-native-reanimated'
import { Dimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'

const win = Dimensions.get('window')

export const Sheet = (props: any = { full: false, noNotch: false, noPadding: false }) => {
  const keyboard = useAnimatedKeyboard()
  const insets = useSafeAreaInsets()

  // Render backdrop remains unchanged
  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  const maxSnapPoint = useDerivedValue(() => {
    return win.height - (props.noNotch ? 0 : insets.top) - keyboard.height.value
  }, [win.height, insets.top, keyboard.height])

  const snapPoints = useDerivedValue(() => {
    return [maxSnapPoint.value]
  }, [maxSnapPoint])

  return (
    <BottomSheet
      backgroundStyle={{
        backgroundColor: c.surface,
        borderRadius: 50,
      }}
      style={{ paddingHorizontal: props.noPadding ? 0 : s.$2 }}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={!props.full}
      maxDynamicContentSize={maxSnapPoint.value}
      snapPoints={snapPoints}
      // handleIndicatorStyle={{ width: s.$10, backgroundColor: c.muted }}
      handleComponent={null}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      onChange={props?.onChange}
      {...props}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps={props.keyboardShouldPersistTaps || 'handled'}
        showsVerticalScrollIndicator={false}
      >
        {props?.children}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

export const SheetScreen = (props: any) => {
  const keyboard = useAnimatedKeyboard()
  const insets = useSafeAreaInsets()
  const { detailsBackdropAnimatedIndex } = useBackdropStore()

  // Render backdrop remains unchanged
  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  const maxSnapPoint = useDerivedValue(() => {
    return win.height - keyboard.height.value
  }, [win.height, insets.top, keyboard.height])

  const snapPoints = useDerivedValue(() => {
    return [maxSnapPoint.value]
  }, [maxSnapPoint])

  return (
    <BottomSheet
      backgroundStyle={{
        backgroundColor: c.surface,
        padding: 0,
      }}
      animatedIndex={detailsBackdropAnimatedIndex}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      enableDynamicSizing={false}
      maxDynamicContentSize={maxSnapPoint.value}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      onChange={props?.onChange}
      {...props}
    >
      {props?.children}
    </BottomSheet>
  )
}
