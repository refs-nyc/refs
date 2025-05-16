import { useState, useEffect, useMemo } from 'react'
import { Image, type ImageProps } from 'expo-image'
import { constructPinataUrl, type OptimizeImageOptions } from '@/features/pinata'
import { useImageStore } from '@/features/pocketbase/stores/images'
import { View } from 'react-native'

function useSignedImageUrl(originalSource: string, imageOptions: OptimizeImageOptions) {
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string | null>(null)
  const { getSignedUrl, signedUrls } = useImageStore()

  const url = useMemo(
    () => constructPinataUrl(originalSource, imageOptions),
    [originalSource, imageOptions]
  )

  useEffect(() => {
    getSignedUrl(url)
  }, [url])

  useEffect(() => {
    if (signedUrls[url]) {
      setSource(signedUrls[url].signedUrl)
      setLoading(false)
    }
  }, [signedUrls[url]])

  return { source, loading }
}

export const SimplePinataImage = ({
  originalSource,
  placeholder,
  placeholderContentFit = 'cover',
  imageOptions,
  ...props
}: {
  originalSource: string
  placeholder?: string
  placeholderContentFit?: ImageProps['contentFit']
  imageOptions: OptimizeImageOptions
} & Omit<ImageProps, 'source'>) => {
  const { source, loading } = useSignedImageUrl(originalSource, imageOptions)
  // Always render an image - either the placeholder during loading or the final source
  return loading ? (
    <View />
  ) : (
    <Image
      {...props}
      contentFit={loading ? placeholderContentFit : 'cover'}
      source={source || placeholder || originalSource}
    />
  )
}
