import { useState, useEffect } from 'react'
// This component takes a local image uri, displays the image and meanwhile posts the image to Pinata
import { Image, type ImageProps } from 'expo-image'
import { View, Text } from 'react-native'
import { getPinataImage, type OptimizeImageOptions } from '@/features/pinata'
import type { ImagePickerAsset } from 'expo-image-picker'

export const SimplePinataImage = ({
  originalSource,
  imageOptions,
  ...props
}: {
  originalSource: string
  imageOptions: OptimizeImageOptions
} & Omit<ImageProps, 'source'>) => {
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const newSource = await getPinataImage(originalSource, imageOptions)

        setSource(newSource)

        setLoading(false)
      } catch (error) {
        console.error(error)
      }
    }

    load()
  }, [])

  return <Image {...props} key={source} contentFit="cover" source={source} />
}
