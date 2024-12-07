import { useState, useEffect } from 'react'
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
  onSuccess: () => void
  onFail: () => void
}) => {
  const [loading, setLoading] = useState(false)
  const [source, setSource] = useState(asset.uri)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const url = await pinataUpload(asset)
        console.log('got signed url')
        setSource(url)
        onSuccess()
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
        {
          <Image
            key={source}
            contentFit="cover"
            style={{ width: '100%', height: '100%' }}
            source={source}
          />
        }
      </View>
    </View>
  )
}
