import AsyncStorage from '@react-native-async-storage/async-storage'
import { pinataSignedUrl, SignedUrlEntry } from '@/features/pinata'
import { createRef, MutableRefObject } from 'react'
import { StateCreator } from 'zustand'
import type { StoreSlices } from './types'

export type OptimizeImageOptions = {
  width: number
  height: number
}

type SignedUrls = Record<string, SignedUrlEntry>

export type GetSignedUrlOptions = {
  signal?: AbortSignal
  reason?: string
  skip?: boolean
}

const MAX_CONCURRENT_SIGNATURES = 2
const MAX_PENDING_SIGNATURES = 8
const LRU_MAX_ENTRIES = 100
const LRU_STORAGE_KEY = 'signedUrlCache.v1'
const RECENT_REQUEST_DEBOUNCE_MS = 400
const SIGNATURE_TIMEOUT_MS = 3500
const SIGNATURE_MAX_ATTEMPTS = 3
const SIGNATURE_RETRY_BASE_DELAY_MS = 450
const SIGNATURE_RETRY_JITTER_MS = 250

const promisePool = createRef<Record<string, Promise<SignedUrlEntry>>>() as MutableRefObject<Record<string, Promise<SignedUrlEntry>>>
promisePool.current = {}

const lruOrderRef = createRef<string[]>() as MutableRefObject<string[]>
lruOrderRef.current = []

let activeSignatureRequests = 0
const signatureWaiters: Array<() => void> = []
const recentlySettled = new Map<string, number>()

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const now = () => Date.now()

const isExpired = (entry: SignedUrlEntry) => entry.expires + entry.date < now()

const logSignatureMetric = (event: string, detail: Record<string, unknown>) => {
  if (__DEV__) {
    console.log(`[sig] ${event}`, detail)
  }
}

const signatureCounters = {
  cacheHit: 0,
  pendingHit: 0,
  fetch: 0,
  aborted: 0,
  timeout: 0,
  retry: 0,
}

let summaryScheduled = false
const scheduleSignatureSummary = () => {
  if (!__DEV__ || summaryScheduled) return
  summaryScheduled = true
  const scheduler = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 0)
  scheduler(() => {
    setTimeout(() => {
      console.log('[sig] summary', signatureCounters)
    }, 0)
  })
}

const acquireSignatureSlot = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (activeSignatureRequests < MAX_CONCURRENT_SIGNATURES) {
      activeSignatureRequests += 1
      resolve(true)
      return
    }

    if (signatureWaiters.length >= MAX_PENDING_SIGNATURES) {
      resolve(false)
      return
    }

    signatureWaiters.push(() => {
      activeSignatureRequests += 1
      resolve(true)
    })
  })

const releaseSignatureSlot = () => {
  activeSignatureRequests = Math.max(0, activeSignatureRequests - 1)
  const next = signatureWaiters.shift()
  if (next) {
    next()
  }
}

const persistCacheAsync = async (entries: Array<[string, SignedUrlEntry]>) => {
  try {
    if (!entries.length) {
      await AsyncStorage.removeItem(LRU_STORAGE_KEY)
      return
    }
    await AsyncStorage.setItem(LRU_STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    if (__DEV__) {
      console.warn('[sig] persist failed', error)
    }
  }
}

const loadPersistedCache = async (set: (fn: (state: any) => any) => void) => {
  try {
    const raw = await AsyncStorage.getItem(LRU_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return

    const filtered: Array<[string, SignedUrlEntry]> = []
    for (const entry of parsed) {
      if (!Array.isArray(entry) || entry.length !== 2) continue
      const [key, value] = entry
      if (typeof key !== 'string' || typeof value !== 'object' || value == null) continue
      if (!('signedUrl' in value) || !('expires' in value) || !('date' in value)) continue
      if (!isExpired(value as SignedUrlEntry)) {
        filtered.push([key, value as SignedUrlEntry])
      }
    }

    if (!filtered.length) {
      lruOrderRef.current = []
      await AsyncStorage.removeItem(LRU_STORAGE_KEY)
      return
    }

    lruOrderRef.current = filtered.map(([key]) => key)
    set((state: { signedUrls: SignedUrls }) => ({
      signedUrls: {
        ...state.signedUrls,
        ...Object.fromEntries(filtered),
      },
    }))
  } catch (error) {
    if (__DEV__) {
      console.warn('[sig] load persisted cache failed', error)
    }
  }
}

export type ImageSlice = {
  promisePool: MutableRefObject<Record<string, Promise<SignedUrlEntry>>>
  signedUrls: SignedUrls
  pendingSignedUrlRequests: Record<string, Promise<SignedUrlEntry>>
  getSignedUrl: (url: string, options?: GetSignedUrlOptions) => Promise<string>
}

export const createImageSlice: StateCreator<StoreSlices, [], [], ImageSlice> = (set, get) => {
  void loadPersistedCache(set)

  return {
    promisePool,
    signedUrls: {},
    pendingSignedUrlRequests: {},
    getSignedUrl: async (url: string, options: GetSignedUrlOptions = {}) => {
      if (!url || options.skip) {
        return url
      }

      scheduleSignatureSummary()

      const state = get()
      if (state.interactionGateActive && options.reason !== 'must') {
        return url
      }
      const cachedSignedUrl = state.signedUrls[url]
      if (cachedSignedUrl && !isExpired(cachedSignedUrl)) {
        signatureCounters.cacheHit += 1
        return cachedSignedUrl.signedUrl
      }

      const pool = state.promisePool.current
      if (Object.prototype.hasOwnProperty.call(pool, url)) {
        signatureCounters.pendingHit += 1
        try {
          const entry = await pool[url]
          if (!isExpired(entry)) {
            return entry.signedUrl
          }
        } catch (error) {
          // continue to retry
          if (__DEV__) {
            console.warn('[sig] pooled request failed', error)
          }
        }
      }

      const lastSettledAt = recentlySettled.get(url)
      if (lastSettledAt && now() - lastSettledAt < RECENT_REQUEST_DEBOUNCE_MS) {
        return url
      }

      const task = (async () => {
        const acquired = await acquireSignatureSlot()
        if (!acquired) {
          throw new Error('signature-queue-full')
        }
        try {
          logSignatureMetric('start', {
            url,
            reason: options.reason ?? 'unknown',
            running: activeSignatureRequests,
            pending: signatureWaiters.length,
          })
          const attemptSignature = async (): Promise<SignedUrlEntry> => {
            const timeoutController = new AbortController()
            let timedOut = false

            const upstreamSignal = options.signal
            const onUpstreamAbort = () => timeoutController.abort()
            upstreamSignal?.addEventListener('abort', onUpstreamAbort)

            const timeoutId = setTimeout(() => {
              timedOut = true
              timeoutController.abort()
            }, SIGNATURE_TIMEOUT_MS)

            signatureCounters.fetch += 1
            try {
              return await pinataSignedUrl(url, { signal: timeoutController.signal })
            } catch (error) {
              if (timedOut) {
                signatureCounters.timeout += 1
              } else if (upstreamSignal?.aborted) {
                signatureCounters.aborted += 1
              }
              throw error
            } finally {
              clearTimeout(timeoutId)
              upstreamSignal?.removeEventListener('abort', onUpstreamAbort)
            }
          }

          let lastError: unknown
          for (let attempt = 0; attempt < SIGNATURE_MAX_ATTEMPTS; attempt += 1) {
            try {
              if (attempt > 0) {
                signatureCounters.retry += 1
              }
              const entry = await attemptSignature()
              recentlySettled.set(url, now())
              return entry
            } catch (error) {
              lastError = error
              if (options.signal?.aborted) {
                throw error
              }
              const shouldRetry = attempt < SIGNATURE_MAX_ATTEMPTS - 1
              if (!shouldRetry) {
                throw error
              }
              const jitter =
                SIGNATURE_RETRY_BASE_DELAY_MS +
                Math.random() * SIGNATURE_RETRY_JITTER_MS +
                attempt * SIGNATURE_RETRY_BASE_DELAY_MS
              await delay(jitter)
            }
          }
          throw lastError
        } finally {
          releaseSignatureSlot()
        }
      })()

      pool[url] = task

      try {
        const signedUrlEntry = await task
        await yieldToMain()

        set((state) => {
          const next = { ...state.signedUrls, [url]: signedUrlEntry }
          const order = lruOrderRef.current.filter((key) => key !== url)
          order.push(url)
          while (order.length > LRU_MAX_ENTRIES) {
            const removedKey = order.shift()
            if (removedKey) {
              delete next[removedKey]
              recentlySettled.delete(removedKey)
            }
          }
          lruOrderRef.current = order
          void persistCacheAsync(order.map((key) => [key, next[key]]))
          return { signedUrls: next }
        })

        logSignatureMetric('stored', {
          url,
          running: activeSignatureRequests,
          pending: signatureWaiters.length,
        })

        return signedUrlEntry.signedUrl
      } catch (error) {
        if (__DEV__) {
          console.warn('[sig] request failed', { url, error })
        }
        if (options.signal?.aborted || (error as any)?.name === 'AbortError' || (error as any)?.message === 'signature-queue-full') {
          recentlySettled.set(url, now())
          return url
        }
        throw error
      } finally {
        delete pool[url]
      }
    },
  }
}
