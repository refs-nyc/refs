import { createRef, MutableRefObject } from 'react'
import { create } from 'zustand'

export type OptimizeImageOptions = {
  width: number
  height: number
}

type SignedUrlEntry = { expires: number; date: number; signedUrl: string }
type SignedUrls = Record<string, SignedUrlEntry>

type PromisePool = MutableRefObject<Record<string, Promise<SignedUrlEntry>>>
const promisePool = createRef<Record<string, Promise<SignedUrlEntry>>>() as PromisePool
promisePool.current = {}

async function getSignedUrlRequest(url: string): Promise<SignedUrlEntry> {
  const date = Date.now()
  const expires = 500000

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_PIN_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      expires,
      date,
      method: 'GET',
    }),
  }

  try {
    const response = await fetch('https://api.pinata.cloud/v3/files/sign', options)
    const value = await response.json()
    return { date, expires, signedUrl: value.data as string }
  } catch (error) {
    console.error(error)
    throw error
  }
}

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
      promiseToAwait = getSignedUrlRequest(url)
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
