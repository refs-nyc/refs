import React from 'react'
import { StyleSheet, Dimensions } from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate, Extrapolation, Easing } from 'react-native-reanimated'
import { c } from '@/features/style'

const { width } = Dimensions.get('window')

export const SwipeToGoBack = ({ 
  onSwipeComplete, 
  children 
}: { 
  onSwipeComplete: () => void
  children: React.ReactNode 
}) => {
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(1)
  const hasTriggeredNav = useSharedValue(false)

  const panGesture = Gesture.Pan()
    .activeOffsetX(15) // Only start after meaningful horizontal movement
    .failOffsetX(-5) // Fail quickly if moving left
    .onUpdate((event) => {
      // Only allow swiping right (positive X)
      if (event.translationX > 0) {
        translateX.value = event.translationX
        // Smooth fade out curve
        opacity.value = interpolate(
          event.translationX,
          [0, width * 0.4],
          [1, 0],
          Extrapolation.CLAMP
        )
      }
    })
    .onEnd((event) => {
      const velocity = event.velocityX
      const shouldComplete = event.translationX > width * 0.25 || velocity > 500

      if (shouldComplete) {
        // Trigger navigation IMMEDIATELY so both fades happen together
        runOnJS(onSwipeComplete)()
        
        // Continue fade out animation - keep interpolating from current value
        const currentOpacity = opacity.value
        opacity.value = withTiming(0, { 
          duration: Math.max(50, (1 - currentOpacity) * 150), // Faster if already faded
          easing: Easing.linear // Match the fade-in
        })
        translateX.value = withTiming(width * 0.2, { 
          duration: 100, 
          easing: Easing.out(Easing.ease) 
        })
      } else {
        // Quick spring back
        translateX.value = withTiming(0, { 
          duration: 180, 
          easing: Easing.out(Easing.quad) 
        })
        opacity.value = withTiming(1, { 
          duration: 180, 
          easing: Easing.out(Easing.quad) 
        })
      }
    })

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    }
  })

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.surface,
  },
})
