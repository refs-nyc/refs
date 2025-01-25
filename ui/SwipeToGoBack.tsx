import React from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated'

const { width } = Dimensions.get('window')

export const SwipeToGoBack = ({ 
  onSwipeComplete, 
  children 
}: { 
  onSwipeComplete: () => void
  children: React.ReactNode 
}) => {
  const translateX = useSharedValue(0)

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow swiping from the left edge
      if (event.translationX > 0) {
        translateX.value = event.translationX
      }
    })
    .onEnd((event) => {
      if (event.translationX > width * 0.3) {
        // Trigger the navigation immediately
        runOnJS(onSwipeComplete)()
        // Animate the view off-screen after navigation is triggered
        translateX.value = withSpring(width)
      } else {
        // Otherwise, reset the position
        translateX.value = withSpring(0)
      }
    })

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
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
  },
})
