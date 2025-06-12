import Animated from 'react-native-reanimated'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated'

import { Pressable } from 'react-native'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const NavigationBackdrop = () => {
  const {
    moduleBackdropAnimatedIndex,
    detailsBackdropAnimatedIndex,
    otherProfileBackdropAnimatedIndex,
    newRefSheetBackdropAnimatedIndex,
    removeRefSheetBackdropAnimatedIndex,
  } = useBackdropStore()

  const animatedStyle = useAnimatedStyle(() => {
    const moduleOpacityValue = interpolate(
      moduleBackdropAnimatedIndex!.value || 0,
      [-1, 0, 1],
      [0, 0, 0.5],
      Extrapolation.CLAMP
    )

    const detailsOpacityValue = interpolate(
      detailsBackdropAnimatedIndex!.value || 0,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )

    const otherProfileOpacityValue = interpolate(
      otherProfileBackdropAnimatedIndex!.value || 0,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )

    const newRefSheetOpacityValue = interpolate(
      newRefSheetBackdropAnimatedIndex!.value || 0,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )

    const removeRefSheetOpacityValue = interpolate(
      removeRefSheetBackdropAnimatedIndex!.value || 0,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )

    const opacityValue =
      1 -
      (1 - moduleOpacityValue) *
        (1 - detailsOpacityValue) *
        (1 - otherProfileOpacityValue) *
        (1 - newRefSheetOpacityValue) *
        (1 - removeRefSheetOpacityValue)

    return {
      opacity: opacityValue,
      display: opacityValue === 0 ? 'none' : 'flex',
    }
  }, [
    moduleBackdropAnimatedIndex,
    detailsBackdropAnimatedIndex,
    otherProfileBackdropAnimatedIndex,
    newRefSheetBackdropAnimatedIndex,
    removeRefSheetBackdropAnimatedIndex,
  ])

  return (
    <AnimatedPressable
      style={[
        {
          zIndex: 1000,
          position: 'absolute',
          height: '100%',
          width: '100%',
          backgroundColor: 'black',
        },
        animatedStyle,
      ]}
    />
  )
}
