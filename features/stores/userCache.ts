import type { StoreSlices } from './types'
import type { Profile } from '../types'
import type { StateCreator } from 'zustand'

export type UserCacheSlice = {
  userProfiles: Record<string, Profile>
  userProfilePromises: { [key: string]: Promise<Profile> | null }
  getUserProfile: (userId: string) => Promise<Profile>
  preloadUserProfile: (userId: string) => void
  clearUserCache: () => void
}

export const createUserCacheSlice: StateCreator<StoreSlices, [], [], UserCacheSlice> = (set, get) => ({
  userProfiles: {},
  userProfilePromises: {},

  getUserProfile: async (userId: string) => {
    const state = get()
    
    // Return cached profile if available
    if (state.userProfiles[userId]) {
      return state.userProfiles[userId]
    }

    // Return existing promise if already fetching
    if (state.userProfilePromises[userId]) {
      return state.userProfilePromises[userId]
    }

    // Create new fetch promise
    const fetchPromise = fetch(`http://localhost:8000/users/${userId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }
        return response.json()
      })
      .then((profile: Profile) => {
        // Cache the result
        set((state) => ({
          userProfiles: {
            ...state.userProfiles,
            [userId]: profile,
          },
          userProfilePromises: {
            ...state.userProfilePromises,
            [userId]: null,
          },
        }))
        return profile
      })
      .catch((error) => {
        // Remove failed promise
        set((state) => ({
          userProfilePromises: {
            ...state.userProfilePromises,
            [userId]: null,
          },
        }))
        throw error
      })

    // Store the promise
    set((state) => ({
      userProfilePromises: {
        ...state.userProfilePromises,
        [userId]: fetchPromise,
      },
    }))

    return fetchPromise
  },

  preloadUserProfile: (userId: string) => {
    const state = get()
    
    // Only preload if not already cached or being fetched
    if (!state.userProfiles[userId] && state.userProfilePromises[userId] === undefined) {
      state.getUserProfile(userId).catch(() => {
        // Silently fail preloading
      })
    }
  },

  clearUserCache: () => {
    set(() => ({
      userProfiles: {},
      userProfilePromises: {},
    }))
  },
}) 