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
  size = 200,
}: {
  asset: ImagePickerAsset | string
  round?: boolean
  style?: any
  onSuccess: (url: string) => void
  onReplace: () => void
  onFail: () => void
  size?: number
}) => {
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(typeof asset === 'string' ? asset : asset?.uri)
  const [pinataSource, setPinataSource] = useState(typeof asset === 'string' ? asset : '')
  const { isConnected } = useNetInfo()

  // Create animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  const handleLongpress = () => {
    if (source || pinataSource) onReplace()
  }

  // Start pulsing animation when loading
  useEffect(() => {
    // @ts-ignore
    let pulseAnimation

    if (loading) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
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
    } else if (pulseAnimation) {
      // @ts-ignore
      pulseAnimation?.stop()
    }

    return () => {
      // @ts-ignore
      if (pulseAnimation) pulseAnimation.stop()
    }
  }, [loading])

  // Handle image upload
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const url = typeof asset === 'string' ? asset : await pinataUpload(asset)
        setPinataSource(url)
        onSuccess(url)

        // Start fade-in animation for pinata image
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setLoading(false)
        })
      } catch (error) {
        console.error(error)
        setLoading(false)
        onFail()
      }
    }
    if (!pinataSource && isConnected) load()
  }, [asset, isConnected])

  return (
    <TouchableOpacity
      onLongPress={handleLongpress}
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          ...style,
          width: size,
          height: size,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: round ? 1000 : 10,
          position: 'relative',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: pinataSource ? Animated.add(1, fadeAnim) : pulseAnim,
          }}
        >
          <Image
            key={`source-${source}`}
            contentFit="cover"
            style={{
              width: size,
              height: size,
            }}
            source={source}
          />
        </Animated.View>
      </View>
    </TouchableOpacity>
  )
}
