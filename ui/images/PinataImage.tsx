import { useState, useEffect } from 'react'
// This component takes a local image uri, displays the image and meanwhile posts the image to Pinata
import { Image } from 'expo-image'
import { View, Text } from 'react-native'
import { pinataUpload } from '@/features/pinata'
import type { ImagePickerAsset } from 'expo-image-picker'
import { useNetInfo } from '@react-native-community/netinfo'

export const PinataImage = ({
  asset,
  round = false,
  style,
  onSuccess,
  onFail,
}: {
  asset: ImagePickerAsset | string
  round?: boolean
  style?: any
  onSuccess: (url: string) => void
  onFail: () => void
}) => {
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(typeof asset === 'string' ? asset : asset?.uri)
  const [pinataSource, setPinataSource] = useState(typeof asset === 'string' ? asset : '')
  const [showOriginal, setShowOriginal] = useState(true)
  const { type, isConnected } = useNetInfo()

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
        onFail()
      }
    }

    if (!pinataSource) load()
  }, [asset])

  return (
    <View
      style={{
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 200,
          height: 200,
          overflow: 'hidden',
          ...style,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: round ? 1000 : 10,
        }}
      >
        {loading && (
          <View
            style={{
              width: 200,
              height: 200,
              position: 'absolute',
              zIndex: 1,
              backgroundColor: 'rgb(243, 242, 237)',
              opacity: 0.5,
              ...style,
            }}
          />
        )}
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
      </View>
    </View>
  )
}
