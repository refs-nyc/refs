import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Dimensions } from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, interpolate, Extrapolation, Easing } from 'react-native-reanimated'
import { c } from '@/features/style'
import { endInteraction, startInteraction } from '@/features/perf/interactions'
import { useAppStore } from '@/features/stores'

const { width } = Dimensions.get('window')
const EDGE_GESTURE_WIDTH = Math.max(24, Math.min(44, width * 0.12))

export const SwipeToGoBack = ({ 
  onSwipeComplete, 
  children,
  interactionLabel = 'swipe-back',
  disablePointerDurationMs = 220,
}: { 
  onSwipeComplete: () => void
  children: React.ReactNode
  interactionLabel?: string
  disablePointerDurationMs?: number
}) => {
  const activateGate = useAppStore((state) => state.activateInteractionGate)
  const deactivateGate = useAppStore((state) => state.deactivateInteractionGate)
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(1)
  const hasTriggeredNav = useSharedValue(false)
  const interactionTokenRef = useRef<number | null>(null)
  const [pointerDisabled, setPointerDisabled] = useState(false)
  const disableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unlockPointer = useCallback(() => {
    if (disableTimeoutRef.current) {
      clearTimeout(disableTimeoutRef.current)
      disableTimeoutRef.current = null
    }
    setPointerDisabled(false)
    hasTriggeredNav.value = false
  }, [hasTriggeredNav])

  const recordInteractionStart = useCallback((label: string) => {
    interactionTokenRef.current = startInteraction(label)
  }, [])

  const recordInteractionEnd = useCallback((label: string) => {
    if (interactionTokenRef.current != null) {
      endInteraction(label, interactionTokenRef.current)
      interactionTokenRef.current = null
    }
  }, [])

  const lockAndComplete = useCallback(() => {
    if (!pointerDisabled) {
      setPointerDisabled(true)
      if (disableTimeoutRef.current) {
        clearTimeout(disableTimeoutRef.current)
      }
      disableTimeoutRef.current = setTimeout(() => {
        unlockPointer()
      }, disablePointerDurationMs)
    }
    onSwipeComplete()
  }, [disablePointerDurationMs, onSwipeComplete, pointerDisabled, unlockPointer])
  useEffect(() => {
    return () => {
      if (disableTimeoutRef.current) {
        clearTimeout(disableTimeoutRef.current)
        disableTimeoutRef.current = null
      }
    }
  }, [])

  const panGesture = Gesture.Pan()
    .onTouchesDown((event, stateManager) => {
      const touchX = event.allTouches?.[0]?.x ?? Number.POSITIVE_INFINITY
      if (touchX > EDGE_GESTURE_WIDTH) {
        stateManager.fail()
      }
    })
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
    .onBegin(() => {
      runOnJS(recordInteractionStart)(interactionLabel)
      runOnJS(activateGate)()
    })
    .onEnd((event) => {
      const velocity = event.velocityX
      const shouldComplete = event.translationX > width * 0.25 || velocity > 500

      if (shouldComplete) {
        // Trigger navigation IMMEDIATELY so both fades happen together
        hasTriggeredNav.value = true
        runOnJS(lockAndComplete)()
        
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
    .onFinalize(() => {
      runOnJS(recordInteractionEnd)(interactionLabel)
      runOnJS(deactivateGate)()
      if (!hasTriggeredNav.value) {
        runOnJS(unlockPointer)()
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
      <Animated.View
        style={[styles.container, animatedStyle]}
        pointerEvents={pointerDisabled ? 'none' : 'auto'}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.surface,
  },
})
