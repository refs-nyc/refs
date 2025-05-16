import { pinataSignedUrl, SignedUrlEntry } from '@/features/pinata'
import { createRef, MutableRefObject } from 'react'
import { create } from 'zustand'

export type OptimizeImageOptions = {
  width: number
  height: number
}

type SignedUrls = Record<string, SignedUrlEntry>

// when we load a view with a lot of images, we have a lot of async requests
// this is a pool of promises that we can use to store the promises for each image
// so that if we request the same image twice, we don't make two requests
// we can just wait for the first promise to resolve and then use that result for the second request
type PromisePool = MutableRefObject<Record<string, Promise<SignedUrlEntry>>>
const promisePool = createRef<Record<string, Promise<SignedUrlEntry>>>() as PromisePool
promisePool.current = {}

export const useImageStore = create<{
  promisePool: PromisePool
  signedUrls: SignedUrls
  pendingSignedUrlRequests: Record<string, Promise<SignedUrlEntry>>
  getSignedUrl: (url: string) => Promise<string>
}>((set, get) => ({
  promisePool,
  signedUrls: {},
  pendingSignedUrlRequests: {},
  getSignedUrl: async (url: string) => {
    // try to get the cached signed url
    const cachedSignedUrl = get().signedUrls[url]

    // if it exists and is not expired, then return it
    if (cachedSignedUrl) {
      const isExpired = cachedSignedUrl.expires + cachedSignedUrl.date > Date.now()
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
      promiseToAwait = pinataSignedUrl(url)
      currentPromisePool[url] = promiseToAwait
    }

    const signedUrlEntry = await promiseToAwait

    set((state) => ({
      signedUrls: {
        ...state.signedUrls,
        [url]: signedUrlEntry,
      },
    }))

    delete currentPromisePool[url]

    return signedUrlEntry.signedUrl
  },
}))
