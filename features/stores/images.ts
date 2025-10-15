import { pinataSignedUrl, SignedUrlEntry } from '@/features/pinata'
import { createRef, MutableRefObject } from 'react'
import { StateCreator } from 'zustand'
import type { StoreSlices } from './types'

export type OptimizeImageOptions = {
  width: number
  height: number
}

type SignedUrls = Record<string, SignedUrlEntry>

const MAX_PARALLEL_SIGNATURES = 2
let activeSignatureRequests = 0
const signatureQueue: Array<() => void> = []

const acquireSignatureSlot = () =>
  new Promise<void>((resolve) => {
    if (activeSignatureRequests < MAX_PARALLEL_SIGNATURES) {
      activeSignatureRequests += 1
      resolve()
    } else {
      signatureQueue.push(() => {
        activeSignatureRequests += 1
        resolve()
      })
    }
  })

const releaseSignatureSlot = () => {
  activeSignatureRequests = Math.max(0, activeSignatureRequests - 1)
  const next = signatureQueue.shift()
  if (next) {
    next()
  }
}

// when we load a view with a lot of images, we have a lot of async requests
// this is a pool of promises that we can use to store the promises for each image
// so that if we request the same image twice, we don't make two requests
// we can just wait for the first promise to resolve and then use that result for the second request
type PromisePool = MutableRefObject<Record<string, Promise<SignedUrlEntry>>>
const promisePool = createRef<Record<string, Promise<SignedUrlEntry>>>() as PromisePool
promisePool.current = {}

export type ImageSlice = {
  promisePool: PromisePool
  signedUrls: SignedUrls
  pendingSignedUrlRequests: Record<string, Promise<SignedUrlEntry>>
  getSignedUrl: (url: string) => Promise<string>
}

export const createImageSlice: StateCreator<StoreSlices, [], [], ImageSlice> = (set, get) => ({
  promisePool,
  signedUrls: {},
  pendingSignedUrlRequests: {},
  getSignedUrl: async (url: string) => {
    // try to get the cached signed url
    const cachedSignedUrl = get().signedUrls[url]

    // if it exists and is not expired, then return it
    if (cachedSignedUrl) {
      const isExpired = cachedSignedUrl.expires + cachedSignedUrl.date < Date.now()
      if (!isExpired) {
        return cachedSignedUrl.signedUrl
      }
    }

    const currentPromisePool = get().promisePool.current
    const cachedPromise = currentPromisePool[url]

    let promiseToAwait: Promise<SignedUrlEntry>
    if (cachedPromise) {
      promiseToAwait = cachedPromise
    } else {
      promiseToAwait = (async () => {
        await acquireSignatureSlot()
        try {
          return await pinataSignedUrl(url)
        } finally {
          releaseSignatureSlot()
        }
      })()
      currentPromisePool[url] = promiseToAwait
    }

    try {
      const signedUrlEntry = await promiseToAwait

      set((state) => ({
        signedUrls: {
          ...state.signedUrls,
          [url]: signedUrlEntry,
        },
      }))

      delete currentPromisePool[url]
      return signedUrlEntry.signedUrl
    } catch (error) {
      // Clean up failed promise from pool
      delete currentPromisePool[url]
      throw error
    }
  },
})
