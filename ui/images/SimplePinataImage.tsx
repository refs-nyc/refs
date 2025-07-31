import { useState, useEffect, useMemo } from 'react'
import { Image, type ImageProps } from 'expo-image'
import { constructPinataUrl, type OptimizeImageOptions } from '@/features/pinata'
import { useAppStore } from '@/features/stores'
import { StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native'

function useSignedImageUrl(originalSource: string, imageOptions: OptimizeImageOptions) {
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string | null>(null)
  const { getSignedUrl, signedUrls } = useAppStore()

  const url = useMemo(
    () => constructPinataUrl(originalSource, imageOptions),
    [originalSource, imageOptions]
  )

  useEffect(() => {
    // Only fetch if we don't already have a valid signed URL
    if (!signedUrls[url] || signedUrls[url].expires + signedUrls[url].date < Date.now()) {
      getSignedUrl(url)
        .then((signedUrl) => {
          setSource(signedUrl)
          setLoading(false)
        })
        .catch(() => {
          // Fallback to original source if signing fails
          setSource(originalSource)
          setLoading(false)
        })
    } else {
      // Use cached signed URL
      setSource(signedUrls[url].signedUrl)
      setLoading(false)
    }
  }, [url, signedUrls[url], originalSource])

  return { source, loading }
}

export const SimplePinataImage = ({
  originalSource,
  imageOptions,
  placeholderStyle = {},
  ...props
}: {
  originalSource: string
  placeholderStyle?: StyleProp<ViewStyle>
  imageOptions: OptimizeImageOptions
} & Omit<ImageProps, 'source'>) => {
  const scale = useWindowDimensions().scale
  const imageOptionsWithScale = {
    height: imageOptions.height * scale,
    width: imageOptions.width * scale,
  }
  const { source, loading } = useSignedImageUrl(originalSource, imageOptionsWithScale)
  return loading ? (
    <View style={placeholderStyle} />
  ) : (
    <Image {...props} contentFit={'cover'} source={source || originalSource} />
  )
}
