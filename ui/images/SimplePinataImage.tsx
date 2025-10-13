import { useState, useEffect, useMemo, useCallback } from 'react'
import { Image, type ImageProps } from 'expo-image'
import { constructPinataUrl, type OptimizeImageOptions } from '@/features/pinata'
import { useAppStore } from '@/features/stores'
import { StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native'

// Cache for signed URLs to avoid repeated API calls
const signedUrlCache = new Map<string, { url: string; expires: number }>()

export function useSignedImageUrl(originalSource: string | null | undefined, imageOptions: OptimizeImageOptions) {
  const safeSource = originalSource?.trim() || ''
  const [loading, setLoading] = useState(Boolean(safeSource))
  const [source, setSource] = useState<string | null>(safeSource || null)
  const { getSignedUrl, signedUrls } = useAppStore()

  const url = useMemo(
    () => (safeSource ? constructPinataUrl(safeSource, imageOptions) : ''),
    [safeSource, imageOptions]
  )
  const cacheKey = url || safeSource

  const fetchSignedUrl = useCallback(async () => {
    if (!safeSource) {
      setSource(null)
      setLoading(false)
      return
    }
    try {
      const targetUrl = cacheKey
      const signedUrl = await getSignedUrl(targetUrl)
      setSource(signedUrl)
      setLoading(false)
      
      // Cache the signed URL
      signedUrlCache.set(targetUrl, {
        url: signedUrl,
        expires: Date.now() + 3600000 // 1 hour cache
      })
    } catch (error) {
      // Fallback to original source if signing fails
      setSource(safeSource)
      setLoading(false)
    }
  }, [url, safeSource, getSignedUrl])

  useEffect(() => {
    if (!safeSource) {
      setSource(null)
      setLoading(false)
      return
    }
    // Check local cache first
    const cached = signedUrlCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      setSource(cached.url)
      setLoading(false)
      return
    }

    // Check Zustand store cache
    const storeEntry = signedUrls[cacheKey]
    if (storeEntry && storeEntry.expires + storeEntry.date > Date.now()) {
      setSource(storeEntry.signedUrl)
      setLoading(false)
      return
    }

    // Fetch new signed URL
    fetchSignedUrl()
  }, [cacheKey, safeSource, signedUrls, fetchSignedUrl])

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
