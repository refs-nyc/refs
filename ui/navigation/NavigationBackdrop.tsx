import Animated from 'react-native-reanimated'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated'

import { Pressable, View } from 'react-native'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const NavigationBackdrop = () => {
  const {
    moduleBackdropAnimatedIndex,
    detailsBackdropAnimatedIndex,
    otherProfileBackdropAnimatedIndex,
    removeRefSheetBackdropAnimatedIndex,
    backdropPressHandlers,
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

    const removeRefSheetOpacityValue = interpolate(
      removeRefSheetBackdropAnimatedIndex!.value || 0,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )

    // mix together the opacity values
    const opacityValue =
      1 -
      (1 - moduleOpacityValue) *
        (1 - detailsOpacityValue) *
        (1 - otherProfileOpacityValue) *
        (1 - removeRefSheetOpacityValue)
    return {
      opacity: opacityValue,
      display: opacityValue < 0.001 ? 'none' : 'flex',
    }
  }, [
    moduleBackdropAnimatedIndex,
    detailsBackdropAnimatedIndex,
    otherProfileBackdropAnimatedIndex,
    removeRefSheetBackdropAnimatedIndex,
  ])

  return (
    <AnimatedPressable
      style={[
        {
          zIndex: 999999,
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          left: 0,
          backgroundColor: 'black',
          elevation: 999999,
        },
        animatedStyle,
      ]}
      onPress={() => {
        // close all of the sheets
        Object.values(backdropPressHandlers).forEach((handler) => handler())
      }}
    />
  )
}
