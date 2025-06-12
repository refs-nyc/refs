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
  } = useBackdropStore()

  const moduleBackdropAnimatedStyle = useAnimatedStyle(() => {
    const opacityValue = interpolate(
      moduleBackdropAnimatedIndex!.value || 0,
      [-1, 0, 1],
      [0, 0, 0.5],
      Extrapolation.CLAMP
    )

    return {
      opacity: opacityValue,
      display: opacityValue === 0 ? 'none' : 'flex',
    }
  }, [moduleBackdropAnimatedIndex])

  const detailsBackdropAnimatedStyle = useAnimatedStyle(() => {
    const opacityValue = interpolate(
      detailsBackdropAnimatedIndex!.value || 0,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )

    return {
      opacity: opacityValue,
      display: opacityValue === 0 ? 'none' : 'flex',
    }
  }, [detailsBackdropAnimatedIndex])

  const otherProfileBackdropAnimatedStyle = useAnimatedStyle(() => {
    const opacityValue = interpolate(
      otherProfileBackdropAnimatedIndex!.value || 0,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )

    return {
      opacity: opacityValue,
      display: opacityValue === 0 ? 'none' : 'flex',
    }
  }, [otherProfileBackdropAnimatedIndex])

  const newRefSheetBackdropAnimatedStyle = useAnimatedStyle(() => {
    const opacityValue = interpolate(
      newRefSheetBackdropAnimatedIndex!.value || 0,
      [-1, 0],
      [0, 0.5],
      Extrapolation.CLAMP
    )

    return {
      opacity: opacityValue,
      display: opacityValue === 0 ? 'none' : 'flex',
    }
  }, [newRefSheetBackdropAnimatedIndex])

  return (
    <>
      <AnimatedPressable
        style={[
          {
            zIndex: 1000,
            position: 'absolute',
            height: '100%',
            width: '100%',
            backgroundColor: 'black',
          },
          moduleBackdropAnimatedStyle,
        ]}
      />
      <AnimatedPressable
        style={[
          {
            zIndex: 1000,
            position: 'absolute',
            height: '100%',
            width: '100%',
            backgroundColor: 'black',
          },
          detailsBackdropAnimatedStyle,
        ]}
      />
      <AnimatedPressable
        style={[
          {
            zIndex: 1000,
            position: 'absolute',
            height: '100%',
            width: '100%',
            backgroundColor: 'black',
          },
          otherProfileBackdropAnimatedStyle,
        ]}
      />
      <AnimatedPressable
        style={[
          {
            zIndex: 1000,
            position: 'absolute',
            height: '100%',
            width: '100%',
            backgroundColor: 'black',
          },
          newRefSheetBackdropAnimatedStyle,
        ]}
      />
    </>
  )
}
