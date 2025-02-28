import { useState, useEffect, useRef } from 'react'
import { Image } from 'expo-image'
import { View, TouchableOpacity, Animated } from 'react-native'
import { pinataUpload } from '@/features/pinata'
import type { ImagePickerAsset } from 'expo-image-picker'
import { useNetInfo } from '@react-native-community/netinfo'

export const PinataImage = ({
  asset,
  round = false,
  style,
  onSuccess,
  onReplace,
  onFail,
}: {
  asset: ImagePickerAsset | string
  round?: boolean
  style?: any
  onSuccess: (url: string) => void
  onReplace: () => void
  onFail: () => void
}) => {
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(typeof asset === 'string' ? asset : asset?.uri)
  const [pinataSource, setPinataSource] = useState(typeof asset === 'string' ? asset : '')
  const [showOriginal, setShowOriginal] = useState(true)
  const { isConnected } = useNetInfo()

  // Create animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(1)).current

  const handleLongpress = () => {
    if (source || pinataSource) onReplace()
  }

  // Start pulsing animation when loading
  useEffect(() => {
    let pulseAnimation

    if (loading) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      )

      pulseAnimation.start()

      // Smoothly transition opacity to pulsing state
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      // Smoothly transition from pulsing back to normal
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      if (pulseAnimation) {
        pulseAnimation.stop()
      }
    }

    return () => {
      if (pulseAnimation) pulseAnimation.stop()
    }
  }, [loading])

  useEffect(() => {
    console.log('is connected from pinata ,', isConnected)
    const load = async () => {
      try {
        setLoading(true)
        const url = typeof asset === 'string' ? asset : await pinataUpload(asset)
        console.log('got signed url')
        setPinataSource(url)
        onSuccess(url)
        setTimeout(() => {
          setShowOriginal(false)
          setLoading(false)
        }, 200)
      } catch (error) {
        console.error(error)
        setLoading(false)
        onFail()
      }
    }
    if (!pinataSource) load()
  }, [asset])

  // Interpolate between normal opacity and pulse animation
  const finalOpacity = Animated.add(
    opacityAnim,
    Animated.multiply(pulseAnim, Animated.subtract(1, opacityAnim))
  )

  return (
    <TouchableOpacity
      onLongPress={handleLongpress}
      style={{
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={{
          ...style,
          width: 200,
          height: 200,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: round ? 1000 : 10,
          opacity: finalOpacity, // Smooth transition between states
        }}
      >
        {pinataSource && (
          <Image
            placeholder={source}
            key={`pinata-${pinataSource}`}
            contentFit="cover"
            placeholderContentFit="cover"
            style={{
              width: 200,
              height: 200,
            }}
            onDisplay={() => {
              setLoading(false)
            }}
            source={pinataSource}
          />
        )}
        {source && showOriginal && (
          <Image
            key={`source-${source}`}
            contentFit="cover"
            style={{
              position: showOriginal ? 'absolute' : 'relative',
              width: 200,
              height: 200,
            }}
            source={source}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  )
}
