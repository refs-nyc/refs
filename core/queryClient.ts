import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV({ id: 'refs-query-cache' })

const instrument = <T>(label: string, task: () => T): T => {
  const started = Date.now()
  const result = task()
  const duration = Date.now() - started
  if (__DEV__ && duration > 25) {
    console.log(`[queryClient:persist] ${label} took ${duration}ms`)
  }
  return result
}

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => {
      try {
        return instrument(`get:${key}`, () => storage.getString(key) ?? null)
      } catch (error) {
        console.warn('[queryClient] getItem failed', error)
        return null
      }
    },
    setItem: (key: string, value: string) => {
      try {
        instrument(`set:${key} size=${value.length}`, () => {
          storage.set(key, value)
        })
      } catch (error) {
        console.warn('[queryClient] setItem failed', error)
      }
    },
    removeItem: (key: string) => {
      try {
        instrument(`remove:${key}`, () => {
          storage.delete(key)
        })
      } catch (error) {
        console.warn('[queryClient] removeItem failed', error)
      }
    },
  },
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 15 * 60_000,
      retry: 2,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000,
})
