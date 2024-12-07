import { useState, useEffect, useMemo } from 'react'
// This component takes a local image uri, displays the image and meanwhile posts the image to Pinata
import { Image } from 'expo-image'
import { View, Text } from 'tamagui'
import { pinataUpload } from '../inputs/Picker'
import type { ImagePickerAsset } from 'expo-image-picker'

export const PinataImage = ({
  asset,
  onSuccess,
  onFail,
}: {
  asset: ImagePickerAsset
  onSuccess: (url: string) => void
  onFail: () => void
}) => {
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(asset.uri)
  const [pinataSource, setPinataSource] = useState('')
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
        }, 200)
      } catch (error) {
        console.error(error)
        onFail()
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [asset])

  return (
    <View width="100%" jc="center" ai="center">
      <View
        style={{ width: 200, height: 200, overflow: 'hidden' }}
        jc="center"
        ai="center"
        borderColor="$surface"
        borderWidth="$1"
        borderRadius={10}
      >
        {pinataSource && (
          <Image
            placeholder={source}
            key={pinataSource}
            contentFit="cover"
            placeholderContentFit="cover"
            style={{ width: '100%', height: '100%' }}
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
