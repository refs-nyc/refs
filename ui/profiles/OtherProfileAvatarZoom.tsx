import { useEffect, useCallback, useRef } from 'react'
import { Pressable, View, StyleSheet, GestureResponderEvent, Dimensions } from 'react-native'
import Animated, { useSharedValue, withTiming, withSpring, useAnimatedStyle } from 'react-native-reanimated'
import { Image } from 'expo-image'
import { useAppStore } from '@/features/stores'
import { c } from '@/features/style'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

export const OtherProfileAvatarZoom = () => {
  const {
    avatarZoomVisible,
    avatarZoomImageUrl,
    closeAvatarZoom,
    otherProfileBackdropAnimatedIndex,
    registerBackdropPress,
    unregisterBackdropPress,
  } = useAppStore()

  const overlayOpacity = useSharedValue(0)
  const overlayScale = useSharedValue(0.85)
  const pinchScale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const backdropPressKeyRef = useRef<string | null>(null)

  const expandedAvatarSize = Math.min(Dimensions.get('window').width * 0.75, 300)

  const handleClose = useCallback(() => {
    if (otherProfileBackdropAnimatedIndex) {
      otherProfileBackdropAnimatedIndex.value = withTiming(-1, { duration: 180 })
    }
    overlayOpacity.value = withTiming(0, { duration: 150 })
    overlayScale.value = withSpring(0.85, {
      damping: 14,
      stiffness: 200,
    })
    pinchScale.value = withTiming(1, { duration: 150 })
    savedScale.value = 1
    
    // Delay state update to allow animation to complete
    setTimeout(() => {
      closeAvatarZoom()
    }, 150)
  }, [closeAvatarZoom, otherProfileBackdropAnimatedIndex, overlayOpacity, overlayScale, pinchScale, savedScale])

  // Register backdrop press handler
  useEffect(() => {
    if (!avatarZoomVisible) {
      if (backdropPressKeyRef.current) {
        unregisterBackdropPress(backdropPressKeyRef.current)
        backdropPressKeyRef.current = null
      }
      return
    }

    const key = registerBackdropPress(() => {
      handleClose()
    })
    backdropPressKeyRef.current = key

    return () => {
      if (backdropPressKeyRef.current) {
        unregisterBackdropPress(backdropPressKeyRef.current)
        backdropPressKeyRef.current = null
      }
    }
  }, [avatarZoomVisible, handleClose, registerBackdropPress, unregisterBackdropPress])

  // Animate in when visible
  useEffect(() => {
    if (avatarZoomVisible) {
      if (otherProfileBackdropAnimatedIndex) {
        otherProfileBackdropAnimatedIndex.value = withTiming(0, { duration: 180 })
      }
      overlayOpacity.value = withTiming(1, { duration: 180 })
      overlayScale.value = withSpring(1, {
        damping: 14,
        stiffness: 200,
      })
      pinchScale.value = 1
      savedScale.value = 1
    }
  }, [avatarZoomVisible, otherProfileBackdropAnimatedIndex, overlayOpacity, overlayScale, pinchScale, savedScale])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backdropPressKeyRef.current) {
        unregisterBackdropPress(backdropPressKeyRef.current)
        backdropPressKeyRef.current = null
      }
      if (otherProfileBackdropAnimatedIndex) {
        otherProfileBackdropAnimatedIndex.value = -1
      }
    }
  }, [otherProfileBackdropAnimatedIndex, unregisterBackdropPress])

  const clamp = (value: number, lower: number, upper: number): number => {
    'worklet'
    return Math.min(Math.max(value, lower), upper)
  }

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      pinchScale.value = clamp(savedScale.value * event.scale, 1, 3)
    })
    .onEnd(() => {
      savedScale.value = clamp(pinchScale.value, 1, 3)
    })

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value * pinchScale.value }],
  }))

  if (!avatarZoomVisible || !avatarZoomImageUrl) {
    return null
  }

  return (
    <Pressable 
      style={[
        StyleSheet.absoluteFill, 
        { zIndex: 10000 }
      ]} 
      onPress={handleClose}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="box-none">
        <Pressable
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation()
          }}
          hitSlop={20}
        >
          <GestureDetector gesture={pinchGesture}>
            <Animated.View
              style={[
                {
                  borderRadius: expandedAvatarSize / 2,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 10 },
                  backgroundColor: c.surface,
                },
                imageAnimatedStyle,
              ]}
            >
              <Image
                source={avatarZoomImageUrl}
                style={{ width: expandedAvatarSize, height: expandedAvatarSize, backgroundColor: c.surface2 }}
                contentFit="cover"
              />
            </Animated.View>
          </GestureDetector>
        </Pressable>
      </View>
    </Pressable>
  )
}
