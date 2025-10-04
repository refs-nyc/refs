import { simpleCache, GRID_PREVIEW_LIMIT } from '@/features/cache/simpleCache'
import { getBacklogItems, getProfileItems } from './items'
import type { ExpandedItem, Profile } from '@/features/types'
import type { StateCreator } from 'zustand'
import type { StoreSlices } from './types'
import { bootStep } from '@/features/debug/bootMetrics'
import { InteractionManager } from 'react-native'

export type ProfileBundle = {
  profile: Profile
  gridItems: ExpandedItem[]
  backlogItems: ExpandedItem[]
  timestamp: number
}

export type ProfileBundleSlice = {
  profileBundles: Record<string, ProfileBundle>
  profileBundlePromises: Record<string, Promise<ProfileBundle> | null>
  getProfileBundle: (userName: string) => Promise<ProfileBundle>
  primeProfileBundle: (userName: string) => void
  clearProfileBundle: (userName?: string) => void
  preloadBundleFromCache: (userName: string, userId: string) => Promise<ProfileBundle | null>
}

export const createProfileBundleSlice: StateCreator<StoreSlices, [], [], ProfileBundleSlice> = (set, get) => ({
  profileBundles: {},
  profileBundlePromises: {},

  async preloadBundleFromCache(userName, userId) {
    const state = get()
    const existing = state.profileBundles[userName]
    if (existing) return existing

    try {
      const [cachedProfile, cachedGridPreview, cachedBacklog] = await Promise.all([
        simpleCache.get<Profile>('profile', userId),
        simpleCache.get<ExpandedItem[]>('grid_items_preview', userId),
        simpleCache.get<ExpandedItem[]>('backlog_items', userId),
      ])

      if (!cachedProfile && !cachedGridPreview?.length) {
        return null
      }

      const bundle: ProfileBundle = {
        profile: cachedProfile ?? state.user ?? ({} as Profile),
        gridItems: cachedGridPreview ?? [],
        backlogItems: cachedBacklog ?? [],
        timestamp: Date.now(),
      }

      set((current) => ({
        profileBundles: {
          ...current.profileBundles,
          [userName]: bundle,
        },
      }))

      return bundle
    } catch (error) {
      console.warn('preloadBundleFromCache failed', error)
      return null
    }
  },

  async getProfileBundle(userName) {
    const state = get()
    const cached = state.profileBundles[userName]
    const viewerUserName = state.user?.userName
    const shouldLog = viewerUserName === userName
    if (shouldLog) {
      bootStep(`profileBundle.${userName}.start`)
    }
    if (cached) {
      if (shouldLog) {
        bootStep(`profileBundle.${userName}.cacheHit`)
      }
      return cached
    }

    const inflight = state.profileBundlePromises[userName]
    if (inflight) {
      if (shouldLog) {
        bootStep(`profileBundle.${userName}.awaitExisting`)
      }
      return inflight
    }

    const fetchPromise = (async (): Promise<ProfileBundle> => {
      const store = get()
      const profileRecord = await store.getUserByUserName(userName)
      const userId = profileRecord.id

      const profile = profileRecord

      let gridItems: ExpandedItem[] = []
      let fetchedFullGrid = false
      let previewDurationMs: string | null = null
      try {
        const previewStart = performance.now()
        const cachedPreview = await simpleCache.get<ExpandedItem[]>('grid_items_preview', userId)
        previewDurationMs = (performance.now() - previewStart).toFixed(1)
        gridItems = cachedPreview ?? []
      } catch (error) {
        console.warn('Grid preview cache read failed', error)
      }

      if (gridItems.length) {
        if (shouldLog) {
          bootStep(
            previewDurationMs
              ? `profileBundle.${userName}.grid.previewHit.${previewDurationMs}ms`
              : `profileBundle.${userName}.grid.previewHit`
          )
        }
        fetchedFullGrid = true
      } else {
        if (shouldLog) {
          bootStep(`profileBundle.${userName}.grid.fetch.start`)
        }
        gridItems = await getProfileItems(userName)
        fetchedFullGrid = true
        if (shouldLog) {
          bootStep(`profileBundle.${userName}.grid.fetch.end`)
        }
        void simpleCache.set('grid_items', gridItems, userId).catch((error) => {
          console.warn('Grid cache persist failed', error)
        })
      }

      // Always extend the profile cache so TTL refreshes
      void simpleCache.set('profile', profileRecord, userId).catch((error) => {
        console.warn('Profile cache persist failed', error)
      })

      let backlogItems: ExpandedItem[] = []

      const bundle: ProfileBundle = {
        profile,
        gridItems,
        backlogItems,
        timestamp: Date.now(),
      }

      set((current) => ({
        profileBundles: {
          ...current.profileBundles,
          [userName]: bundle,
        },
        profileBundlePromises: {
          ...current.profileBundlePromises,
          [userName]: null,
        },
      }))

      const applyBacklogUpdate = (next: ExpandedItem[]) => {
        if (!next?.length) return
        set((current) => {
          const existing = current.profileBundles[userName]
          if (!existing) {
            return {
              profileBundles: {
                ...current.profileBundles,
                [userName]: {
                  profile,
                  gridItems,
                  backlogItems: next,
                  timestamp: Date.now(),
                },
              },
            }
          }

          const sameLength = existing.backlogItems.length === next.length
          const sameContent = sameLength && existing.backlogItems.every((item, index) => item.id === next[index]?.id)

          if (sameContent) {
            return current
          }

          return {
            profileBundles: {
              ...current.profileBundles,
              [userName]: {
                ...existing,
                backlogItems: next,
                timestamp: Date.now(),
              },
            },
          }
        })
      }

      const scheduleBacklogRefresh = () => {}
      if (shouldLog) {
        bootStep(`profileBundle.${userName}.resolved`)
      }

      return bundle
    })()

    set((current) => ({
      profileBundlePromises: {
        ...current.profileBundlePromises,
        [userName]: fetchPromise,
      },
    }))

    try {
      const bundle = await fetchPromise
      return bundle
    } catch (error) {
      set((current) => ({
        profileBundlePromises: {
          ...current.profileBundlePromises,
          [userName]: null,
        },
      }))
      throw error
    }
  },

  primeProfileBundle(userName) {
    const state = get()
    if (state.profileBundles[userName] || state.profileBundlePromises[userName]) return
    state
      .getProfileBundle(userName)
      .catch(() => {
        // Silent failure for background prime
      })
      .finally(() => {})
  },

  clearProfileBundle(userName) {
    if (userName) {
      set((current) => {
        const { [userName]: _, ...rest } = current.profileBundles
        const { [userName]: __, ...promiseRest } = current.profileBundlePromises
        return {
          profileBundles: rest,
          profileBundlePromises: promiseRest,
        }
      })
      return
    }

    set(() => ({
      profileBundles: {},
      profileBundlePromises: {},
    }))
  },
})
