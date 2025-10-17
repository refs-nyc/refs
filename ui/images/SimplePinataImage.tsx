import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Image, type ImageProps } from 'expo-image'
import { constructPinataUrl, type OptimizeImageOptions } from '@/features/pinata'
import { useAppStore } from '@/features/stores'
import { StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native'
import { enqueueIdleTask, isIdleTaskContext } from '@/features/utils/idleQueue'

const SIGNATURE_SKIP_THRESHOLD = 80
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const MEMORY_CACHE_MAX_ENTRIES = 100
const UNSIGNED_RETRY_DELAY_MS = 400
const UNSIGNED_RETRY_LIMIT = 3

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
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(safeSource || null)
  const { getSignedUrl, signedUrls } = useAppStore()
  const priority = options.priority ?? 'low'
  const reason = useMemo(
    () => options.reason ?? (priority === 'must' ? 'must' : 'SimplePinataImage'),
    [options.reason, priority]
  )

  const url = useMemo(() => (safeSource ? constructPinataUrl(safeSource, imageOptions) : ''), [safeSource, imageOptions])
  const cacheKey = url || safeSource

  const controllerRef = useRef<AbortController | null>(null)
  const retryTokenRef = useRef<{ key: string; count: number }>({ key: '', count: 0 })
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const isMountedRef = useRef(true)
  const lastGoodUrlRef = useRef<string | null>(safeSource || null)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!lastGoodUrlRef.current && safeSource) {
      lastGoodUrlRef.current = safeSource
    }
  }, [safeSource])
  const shouldSign = useMemo(() => {
    const maxDimension = Math.max(imageOptions.width, imageOptions.height)
    return maxDimension > SIGNATURE_SKIP_THRESHOLD
  }, [imageOptions.height, imageOptions.width])

  const fetchSignedUrl = useCallback(
    async (signal: AbortSignal) => {
      if (!safeSource) {
        setResolvedUrl(lastGoodUrlRef.current)
        return
      }

      try {
        const targetUrl = cacheKey
        const signedUrl = await getSignedUrl(targetUrl, {
          signal,
          reason,
          skip: !shouldSign,
        })
        if (signal.aborted) return
        const needsRetry =
          shouldSign &&
          signedUrl === targetUrl &&
          targetUrl.includes('mypinata.cloud')

        if (!needsRetry && shouldSign) {
          lastGoodUrlRef.current = signedUrl
        }

        const nextSource = needsRetry ? lastGoodUrlRef.current ?? signedUrl : signedUrl
        setResolvedUrl(nextSource)

        if (needsRetry) {
          const state = retryTokenRef.current
          if (state.key !== cacheKey) {
            retryTokenRef.current = { key: cacheKey, count: 0 }
          }
          if (retryTokenRef.current.count < UNSIGNED_RETRY_LIMIT && isMountedRef.current) {
            retryTokenRef.current.count += 1
            if (!retryTimeoutRef.current) {
              retryTimeoutRef.current = setTimeout(() => {
                retryTimeoutRef.current = null
                if (isMountedRef.current) {
                  setRetryToken((token) => token + 1)
                }
              }, UNSIGNED_RETRY_DELAY_MS * retryTokenRef.current.count)
            }
          }
          return
        }

        retryTokenRef.current = { key: cacheKey, count: 0 }
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current)
          retryTimeoutRef.current = null
        }

        if (shouldSign && !needsRetry) {
          storeCacheEntry(targetUrl, signedUrl)
        }
      } catch (error) {
        if (signal.aborted) return
        // Fall back to the unsigned source; screen will still render while we retry later.
        const fallback = lastGoodUrlRef.current ?? safeSource ?? null
        if (fallback) {
          lastGoodUrlRef.current = fallback
        }
        setResolvedUrl((prev) => prev ?? fallback)
      }
    },
    [cacheKey, safeSource, getSignedUrl, shouldSign, reason]
  )

  useEffect(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    if (retryTokenRef.current.key !== cacheKey) {
      retryTokenRef.current = { key: cacheKey, count: 0 }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }

    if (!safeSource) {
      setResolvedUrl(lastGoodUrlRef.current)
      return
    }

    if (!shouldSign) {
      const base = cacheKey || safeSource
      lastGoodUrlRef.current = base
      setResolvedUrl(base)
      return
    }

    const cached = getCacheEntry(cacheKey)
    if (cached) {
      lastGoodUrlRef.current = cached.url
      setResolvedUrl(cached.url)
      return
    }

    const storeEntry = signedUrls[cacheKey]
    if (storeEntry && storeEntry.expires + storeEntry.date > Date.now()) {
      lastGoodUrlRef.current = storeEntry.signedUrl
      setResolvedUrl(storeEntry.signedUrl)
      storeCacheEntry(cacheKey, storeEntry.signedUrl)
      return
    }

    const fallback = lastGoodUrlRef.current ?? safeSource
    lastGoodUrlRef.current = fallback
    setResolvedUrl(fallback)

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
  }, [cacheKey, safeSource, signedUrls, fetchSignedUrl, shouldSign, priority, retryToken])

  return { source: resolvedUrl }
}

export const SimplePinataImage = ({
  originalSource,
  imageOptions,
  placeholderStyle,
  style,
  ...rest
}: {
  originalSource: string
  placeholderStyle?: StyleProp<ViewStyle>
  imageOptions: OptimizeImageOptions
} & Omit<ImageProps, 'source' | 'style'> & { style?: ImageProps['style'] }) => {
  const scale = useWindowDimensions().scale

  const imageOptionsWithScale = useMemo(
    () => ({
      height: imageOptions.height * scale,
      width: imageOptions.width * scale,
    }),
    [imageOptions.height, imageOptions.width, scale]
  )

  const { source } = useSignedImageUrl(originalSource, imageOptionsWithScale)
  const finalSource = source ?? originalSource ?? null
  const imageStyle: ImageProps['style'] = style ?? { width: '100%', height: '100%' }

  return (
    <View style={placeholderStyle}>
      <Image
        {...rest}
        style={imageStyle}
        contentFit="cover"
        transition={0}
        recyclingKey={originalSource}
        cachePolicy="immutable"
        priority="normal"
        source={finalSource || undefined}
      />
    </View>
  )
}
