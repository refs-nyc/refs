import React from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'

export const GlobalBackdrop = () => {
  const { globalBackdropAnimatedIndex } = useBackdropStore()

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      globalBackdropAnimatedIndex?.value ?? -1,
      [-1, 0],
      [0, 0.5],
      'clamp'
    )

    return {
      opacity,
    }
  })

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'black',
          zIndex: 999,
          pointerEvents: 'none', // Don't block touches when not visible
        },
        animatedStyle,
      ]}
    />
  )
} 