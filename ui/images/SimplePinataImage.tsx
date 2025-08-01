import { useState, useEffect, useMemo, useCallback } from 'react'
import { Image, type ImageProps } from 'expo-image'
import { constructPinataUrl, type OptimizeImageOptions } from '@/features/pinata'
import { useAppStore } from '@/features/stores'
import { StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native'

// Cache for signed URLs to avoid repeated API calls
const signedUrlCache = new Map<string, { url: string; expires: number }>()

function useSignedImageUrl(originalSource: string, imageOptions: OptimizeImageOptions) {
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<string | null>(null)
  const { getSignedUrl, signedUrls } = useAppStore()

  const url = useMemo(
    () => constructPinataUrl(originalSource, imageOptions),
    [originalSource, imageOptions]
  )

  const fetchSignedUrl = useCallback(async () => {
    try {
      const signedUrl = await getSignedUrl(url)
      setSource(signedUrl)
      setLoading(false)
      
      // Cache the signed URL
      signedUrlCache.set(url, {
        url: signedUrl,
        expires: Date.now() + 3600000 // 1 hour cache
      })
    } catch (error) {
      // Fallback to original source if signing fails
      setSource(originalSource)
      setLoading(false)
    }
  }, [url, originalSource, getSignedUrl])

  useEffect(() => {
    // Check local cache first
    const cached = signedUrlCache.get(url)
    if (cached && cached.expires > Date.now()) {
      setSource(cached.url)
      setLoading(false)
      return
    }

    // Check Zustand store cache
    if (signedUrls[url] && signedUrls[url].expires + signedUrls[url].date > Date.now()) {
      setSource(signedUrls[url].signedUrl)
      setLoading(false)
      return
    }

    // Fetch new signed URL
    fetchSignedUrl()
  }, [url, signedUrls[url], originalSource, fetchSignedUrl])

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
  
  const imageOptionsWithScale = useMemo(() => ({
    height: imageOptions.height * scale,
    width: imageOptions.width * scale,
  }), [imageOptions.height, imageOptions.width, scale])
  
  const { source, loading } = useSignedImageUrl(originalSource, imageOptionsWithScale)
  
  if (loading) {
    return <View style={placeholderStyle} />
  }
  
  return (
    <Image 
      {...props} 
      contentFit={'cover'} 
      source={source || originalSource}
      // Add performance optimizations
      cachePolicy="memory-disk"
      priority="normal"
    />
  )
}
