import { useState, useEffect } from 'react'
// This component takes a local image uri, displays the image and meanwhile posts the image to Pinata
import { Image } from 'expo-image'
import { View, Text } from 'react-native'
import { pinataUpload } from '../inputs/Picker'
import type { ImagePickerAsset } from 'expo-image-picker'

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
  const [source, setSource] = useState(asset?.uri || asset)
  const [pinataSource, setPinataSource] = useState(typeof asset === 'string' ? asset : '')
  const [showOriginal, setShowOriginal] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const url = await pinataUpload(asset)
        console.log('got signed url')
        setPinataSource(url)
        onSuccess(url)

        setTimeout(() => {
          setShowOriginal(false)
          console.log('faded out now')
          setLoading(false)
        }, 200)
      } catch (error) {
        console.error(error)
        onFail()
      }
    }

    console.log(asset)

    if (!pinataSource) load()
  }, [asset])

  return (
    <View width="100%" jc="center" ai="center">
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
            key={pinataSource}
            contentFit="cover"
            placeholderContentFit="cover"
            style={{
              width: '100%',
              height: '100%',
            }}
            onDisplay={() => {
              setLoading(false)
            }}
            source={pinataSource}
          />
        )}

        {source && showOriginal && (
          <Image
            key={source}
            contentFit="cover"
            style={{
              position: showOriginal ? 'absolute' : 'relative',
              width: '100%',
              height: '100%',
            }}
            source={source}
          />
        )}
      </View>
    </View>
  )
}
