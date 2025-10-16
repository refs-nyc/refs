import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Image, type ImageProps } from 'expo-image'
import { constructPinataUrl, type OptimizeImageOptions } from '@/features/pinata'
import { useAppStore } from '@/features/stores'
import { StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native'
import { enqueueIdleTask, isIdleTaskContext } from '@/features/utils/idleQueue'

const SIGNATURE_SKIP_THRESHOLD = 80
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const MEMORY_CACHE_MAX_ENTRIES = 100

// Cache for signed URLs to avoid repeated API calls
const signedUrlCache = new Map<string, { url: string; expires: number }>()
const memoryCacheOrder: string[] = []

type CacheEntry = {
  url: string
  expires: number
}

const getCacheEntry = (key: string): CacheEntry | null => {
  const entry = signedUrlCache.get(key)
  if (!entry) return null
  if (entry.expires <= Date.now()) {
    signedUrlCache.delete(key)
    const index = memoryCacheOrder.indexOf(key)
    if (index !== -1) {
      memoryCacheOrder.splice(index, 1)
    }
    return null
  }
  const index = memoryCacheOrder.indexOf(key)
  if (index !== -1) {
    memoryCacheOrder.splice(index, 1)
  }
  memoryCacheOrder.push(key)
  return entry
}

const storeCacheEntry = (key: string, url: string) => {
  signedUrlCache.set(key, {
    url,
    expires: Date.now() + CACHE_TTL_MS,
  })
  const index = memoryCacheOrder.indexOf(key)
  if (index !== -1) {
    memoryCacheOrder.splice(index, 1)
  }
  memoryCacheOrder.push(key)
  while (memoryCacheOrder.length > MEMORY_CACHE_MAX_ENTRIES) {
    const evicted = memoryCacheOrder.shift()
    if (evicted) {
      signedUrlCache.delete(evicted)
    }
  }
}

export function useSignedImageUrl(
  originalSource: string | null | undefined,
  imageOptions: OptimizeImageOptions,
  options: { priority?: 'must' | 'low'; reason?: string } = {}
) {
  const safeSource = originalSource?.trim() || ''
  const [loading, setLoading] = useState(Boolean(safeSource))
  const [source, setSource] = useState<string | null>(safeSource || null)
  const { getSignedUrl, signedUrls } = useAppStore()
  const priority = options.priority ?? 'low'

  const url = useMemo(() => (safeSource ? constructPinataUrl(safeSource, imageOptions) : ''), [safeSource, imageOptions])
  const cacheKey = url || safeSource

  const controllerRef = useRef<AbortController | null>(null)
  const shouldSign = useMemo(() => {
    const maxDimension = Math.max(imageOptions.width, imageOptions.height)
    return maxDimension > SIGNATURE_SKIP_THRESHOLD
  }, [imageOptions.height, imageOptions.width])

  const fetchSignedUrl = useCallback(
    async (signal: AbortSignal) => {
      if (!safeSource) {
        setSource(null)
        setLoading(false)
        return
      }

      try {
        const targetUrl = cacheKey
        const signedUrl = await getSignedUrl(targetUrl, {
          signal,
          reason: options.reason ?? (priority === 'must' ? 'must' : 'SimplePinataImage'),
          skip: !shouldSign,
        })
        if (signal.aborted) return
        setSource(signedUrl)
        setLoading(false)
        if (shouldSign) {
          storeCacheEntry(targetUrl, signedUrl)
        }
      } catch (error) {
        if (signal.aborted) return
        // Fall back to the unsigned source; screen will still render while we retry later.
        setSource(safeSource)
        setLoading(false)
      }
    },
    [cacheKey, safeSource, getSignedUrl, shouldSign]
  )

  useEffect(() => {
    controllerRef.current?.abort()
    controllerRef.current = null

    if (!safeSource) {
      setSource(null)
      setLoading(false)
      return
    }

    if (!shouldSign) {
      setSource(cacheKey || safeSource)
      setLoading(false)
      return
    }

    const cached = getCacheEntry(cacheKey)
    if (cached) {
      setSource(cached.url)
      setLoading(false)
      return
    }

    const storeEntry = signedUrls[cacheKey]
    if (storeEntry && storeEntry.expires + storeEntry.date > Date.now()) {
      setSource(storeEntry.signedUrl)
      setLoading(false)
      storeCacheEntry(cacheKey, storeEntry.signedUrl)
      return
    }

    setSource(safeSource)
    setLoading(false)

    const controller = new AbortController()
    controllerRef.current = controller

    const scheduleFetch = () => {
      fetchSignedUrl(controller.signal).catch(() => {})
    }

    if (isIdleTaskContext() || priority === 'must') {
      scheduleFetch()
    } else {
      enqueueIdleTask(async () => {
        scheduleFetch()
      }, { label: `image:signed:${cacheKey}`, priority: 'low' })
    }

    return () => {
      controller.abort()
      controllerRef.current = null
    }
  }, [cacheKey, safeSource, signedUrls, fetchSignedUrl, shouldSign])

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

  const imageOptionsWithScale = useMemo(
    () => ({
      height: imageOptions.height * scale,
      width: imageOptions.width * scale,
    }),
    [imageOptions.height, imageOptions.width, scale]
  )

  const { source, loading } = useSignedImageUrl(originalSource, imageOptionsWithScale)

  if (loading) {
    return <View style={placeholderStyle} />
  }

  return (
    <Image
      {...props}
      contentFit="cover"
      source={source || originalSource}
      cachePolicy="memory"
      priority="normal"
    />
  )
}
