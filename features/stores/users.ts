import { StateCreator } from 'zustand'
import { Profile, ExpandedProfile } from '../types'
import { UsersRecord } from '../pocketbase/pocketbase-types'
import { ClientResponseError } from 'pocketbase'
import type { StoreSlices } from './types'
import { pocketbase } from '../pocketbase'
import { InteractionManager } from 'react-native'
import { updateShowInDirectory } from './items'
import { clearPersistedQueryClient } from '@/core/queryClient'
const OFF_AUTH_RESTORE = process.env.EXPO_PUBLIC_OFF_AUTH_RESTORE === '1'

export type DirectoryUser = {
  id: string
  userName: string
  name: string
  neighborhood: string
  avatar_url: string
  topRefs: string[]
  _latest?: number
}

export type UserSlice = {
  stagedUser: Partial<Profile> & { password?: string; passwordConfirm?: string }
  user: Profile | null
  isInitialized: boolean
  register: () => Promise<ExpandedProfile>
  updateUser: (fields: Partial<Profile>) => Promise<Profile>
  updateStagedUser: (formFields: Partial<Profile> & { password?: string; passwordConfirm?: string }) => void
  loginWithPassword: (email: string, password: string) => Promise<any>
  getUserByEmail: (email: string) => Promise<Profile>
  getUserByUserName: (userName: string) => Promise<Profile>
  getUsersByIds: (ids: string[]) => Promise<Profile[]>
  getRandomUser: () => Promise<Profile>
  login: (userName: string) => Promise<Profile>
  logout: () => void
  init: () => Promise<void>
}

export const createUserSlice: StateCreator<StoreSlices, [], [], UserSlice> = (set, get) => ({
  stagedUser: {},
  user: null, // user is ALWAYS the user of the app, this is only set if the user is logged in
  isInitialized: false,
  //
  //
  //
  init: async () => {
    const startedAt = Date.now()
    console.log('[boot-trace] user.init:start')
    try {
      const primeBackgroundData = () => {
        const warmFeedFromCache = get().ensureFeedHydrated
        const refreshFeed = get().refreshFeed
        setTimeout(() => {
          const feedStart = Date.now()
          if (typeof warmFeedFromCache === 'function') {
            warmFeedFromCache({ refresh: false }).catch((error: unknown) => {
              console.warn('Initial feed cache hydration failed', error)
            })
          }

          if (typeof refreshFeed === 'function') {
            // First feed refresh happens when the sheet/home feed triggers it.
          }
          if (__DEV__) {
            console.log('[boot-trace] user.init:primeBackgroundData scheduled', Date.now() - feedStart, 'ms')
          }
        }, 0)
      }

      // Mark as initialized immediately to allow UI to be responsive
      set(() => ({
        isInitialized: true,
        homePagerIndex: 0,
        profileNavIntent: null,
      }))


      // If PocketBase has a valid auth store, sync it with our store
      if (!OFF_AUTH_RESTORE && pocketbase.authStore.isValid && pocketbase.authStore.record) {
        try {
          // Optimize by not expanding items on init - load them separately if needed
          const record = await pocketbase
            .collection<Profile>('users')
            .getOne(pocketbase.authStore.record.id)

          set(() => ({
            user: record,
            homePagerIndex: 0,
            profileNavIntent: null,
          }))

          primeBackgroundData()
        } catch (error) {
          console.error('Failed to sync user state:', error)
          // If we can't get the user record, clear the auth store
          pocketbase.authStore.clear()
          set(() => ({
            user: null,
            homePagerIndex: 0,
            profileNavIntent: null,
          }))
        }
      } else {
        // No valid auth, mark as initialized with no user
        set(() => ({
          user: null,
          homePagerIndex: 0,
          profileNavIntent: null,
        }))
      }
    } catch (error) {
      console.error('Init error:', error)
      set(() => ({
        user: null,
        homePagerIndex: 0,
        profileNavIntent: null,
      }))
    }
    console.log('[boot-trace] user.init:complete', Date.now() - startedAt, 'ms')
  },
  //
  //
  //
  updateStagedUser: (formFields: Partial<Profile> & { password?: string; passwordConfirm?: string }) => {
    set((state) => ({
      stagedUser: { ...state.stagedUser, ...formFields },
    }))

    const updatedState = get().stagedUser

    return updatedState
  },
  //
  //
  //
  updateUser: async (fields: Partial<Profile>) => {
    try {
      if (!pocketbase.authStore.record) {
        throw new Error('not logged in')
      }

      const record = await pocketbase
        .collection<UsersRecord>('users')
        .update(pocketbase.authStore.record.id, { ...fields })

      // Update local store so UI reflects changes immediately
      set((state) => ({
        user: state.user ? { ...state.user, ...record } : record,
      }))

      // If avatar/image was updated, check if we should update show_in_directory flag
      if (fields.image || fields.avatar_url) {
        const userId = pocketbase.authStore.record.id
        InteractionManager.runAfterInteractions(() => {
          requestAnimationFrame(() => {
            updateShowInDirectory(userId).catch(error => {
              console.warn('Failed to update show_in_directory:', error)
            })
          })
        })
      }

      return record
    } catch (err) {
      console.error(err)
      throw err
    }
  },
  //
  //
  //
  getUserByEmail: async (email: string) => {
    const userRecord = await pocketbase
      .collection<Profile>('users')
      .getFirstListItem(`email = "${email}"`)
    set(() => ({
      stagedUser: userRecord,
    }))

    return userRecord
  },
  getUserByUserName: async (userName: string) => {
    const userRecord = await pocketbase
      .collection<Profile>('users')
      .getFirstListItem(`userName = "${userName}"`)
    return userRecord
  },
  getUsersByIds: async (ids: string[]) => {
    const filter = ids.map((id) => `id="${id}"`).join(' || ')
    return await pocketbase.collection('users').getFullList<Profile>({
      filter: filter,
    })
  },
  getRandomUser: async () => {
    const result = await pocketbase.collection('users').getList<Profile>(1, 1, {
      filter: 'items:length > 5',
      sort: '@random',
    })
    return result.items[0]
  },
  //
  // Requirement: staged user
  //
  register: async () => {
    // Build a clean create payload; avoid leaking system fields like id/created/updated
    const staged = get().stagedUser as any
    const finalUser: any = {
      email: staged?.email,
      emailVisibility: true,
      password: staged?.password,
      passwordConfirm: staged?.passwordConfirm,
      firstName: staged?.firstName,
      lastName: staged?.lastName,
      image: staged?.image,
      location: staged?.location,
      lat: staged?.lat,
      lon: staged?.lon,
      userName: staged?.userName,
    }

    if (!finalUser) throw Error('No user data')
    if (!finalUser.email) throw Error('User must have email')

    const userPassword = get().stagedUser.password
    if (!userPassword) throw Error('User must have password')

    // Generate a username (match legacy behavior: lowercase firstName + 4-char suffix)
    if (!finalUser.userName) {
      const firstNamePart = finalUser.firstName ? (finalUser.firstName as string).toLowerCase() : 'user'
      const shortUuid = Math.random().toString(36).substring(2, 6) // 4 chars
      finalUser.userName = `${firstNamePart}-${shortUuid}`
    }

    try {
      const record = await pocketbase
        .collection('users')
        .create<ExpandedProfile>(finalUser, { expand: 'items,items.ref' })

      await get().loginWithPassword(finalUser.email, userPassword)

      set(() => ({
        user: record,
      }))
      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  //
  //
  //
  loginWithPassword: async (email: string, password: string) => {
    const response = await pocketbase
      .collection<UsersRecord>('users')
      .authWithPassword(email, password)
    set(() => ({
      user: response.record,
    }))
    return response.record
  },
  //
  //
  //
  login: async (userName: string) => {
    try {
      const record = await pocketbase
        .collection<Profile>('users')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

      // Get the user's email from the record
      if (!record.email) {
        throw new Error('User has no email')
      }

      // Get the password from staged user
      const password = get().stagedUser.password
      if (!password) {
        throw new Error('No password provided')
      }

      // Authenticate with PocketBase
      await pocketbase.collection('users').authWithPassword(record.email, password)

      set(() => ({
        user: record,
      }))
      return record
    } catch (error) {
      if ((error as ClientResponseError).status === 404) {
        try {
          const record = await get().register()

          set(() => ({
            user: record,
          }))

          return record
        } catch (err) {
          console.error(err)
        }
      }
      console.error(error)
      throw error
    }
  },
  //
  //
  //
  logout: () => {
    set(() => ({
      user: null,
      stagedUser: {},
      isInitialized: true,
    }))

    const resetFeed = get().resetFeed
    if (typeof resetFeed === 'function') {
      resetFeed()
    }

    clearPersistedQueryClient()

    pocketbase.realtime.unsubscribe()
    pocketbase.authStore.clear()
  },
})
