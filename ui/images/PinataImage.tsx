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
  const { isConnected } = useNetInfo()

  // Create animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

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
      pulseAnimation.stop()
    }

    return () => {
      if (pulseAnimation) pulseAnimation.stop()
    }
  }, [loading])

  // Handle image upload
  useEffect(() => {
    console.log('is connected from pinata ,', isConnected)
    const load = async () => {
      try {
        setLoading(true)
        const url = typeof asset === 'string' ? asset : await pinataUpload(asset)
        console.log('got signed url')
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
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          ...style,
          width: 200,
          height: 200,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: round ? 1000 : 10,
          position: 'relative',
        }}
      >
        {/* Always show local image until Pinata image is loaded */}
        {source && (
          <Animated.View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: pinataSource ? Animated.subtract(1, fadeAnim) : pulseAnim,
            }}
          >
            <Image
              key={`source-${source}`}
              contentFit="cover"
              style={{
                width: 200,
                height: 200,
              }}
              source={source}
            />
          </Animated.View>
        )}

        {/* Fade in Pinata image once loaded */}
        {pinataSource && (
          <Animated.View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: fadeAnim,
            }}
          >
            <Image
              key={`pinata-${pinataSource}`}
              contentFit="cover"
              style={{
                width: 200,
                height: 200,
              }}
              source={pinataSource}
            />
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  )
}
