import { useMemo, useEffect, useCallback, useState } from 'react'
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { c, s } from '@/features/style'
import { useAnimatedKeyboard, useDerivedValue } from 'react-native-reanimated'
import { Dimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
    console.log(maxSnapPoint)
    return [maxSnapPoint.value]
  }, [maxSnapPoint])

  return (
    <BottomSheet
      {...props}
      backgroundStyle={{
        backgroundColor: c.surface,
      }}
      style={{ paddingHorizontal: props.noPadding ? 0 : s.$2 }}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={!props.full}
      maxDynamicContentSize={maxSnapPoint.value}
      snapPoints={snapPoints}
      handleIndicatorStyle={{ width: s.$10, backgroundColor: c.muted }}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      onChange={props?.onChange}
    >
      <BottomSheetScrollView showsVerticalScrollIndicator={false}>
        {props?.children}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

export const SheetScreen = (props: any) => {
  const keyboard = useAnimatedKeyboard()
  const insets = useSafeAreaInsets()

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
      {...props}
      backgroundStyle={{
        backgroundColor: c.surface,
      }}
      backdropComponent={renderBackdrop}
      enableDynamicSizing={false}
      maxDynamicContentSize={maxSnapPoint.value}
      snapPoints={snapPoints}
      handleComponent={() => {
        console.log('Working from handle')
        return <View style={{ width: win.width, height: win.height }}>{props?.children}</View>
      }}
      enablePanDownToClose={true}
      keyboardBehavior="interactive"
      onChange={props?.onChange}
    />
  )
}
