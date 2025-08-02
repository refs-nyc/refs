import { StateCreator } from 'zustand'
import { Profile, ExpandedProfile } from '../types'
import { UsersRecord } from '../pocketbase/pocketbase-types'
import { ClientResponseError } from 'pocketbase'
import type { StoreSlices } from './types'

// Lazy-load PocketBase to prevent immediate crashes
let pocketbase: any = null
const getPocketBase = () => {
  if (!pocketbase) {
    try {
      pocketbase = require('../pocketbase').pocketbase
    } catch (error) {
      console.error('Failed to load PocketBase:', error)
      return null
    }
  }
  return pocketbase
}

export type UserSlice = {
  stagedUser: Partial<Profile> & { password?: string }
  user: Profile | null
  isInitialized: boolean
  register: () => Promise<ExpandedProfile>
  updateUser: (fields: Partial<Profile>) => Promise<Profile>
  updateStagedUser: (formFields: Partial<Profile>) => void
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
    try {
      // Mark as initialized immediately to allow UI to be responsive
      set(() => ({
        isInitialized: true,
      }))

      const pb = getPocketBase()
      if (!pb) {
        console.error('PocketBase not available during init')
        set(() => ({
          user: null,
        }))
        return
      }

      // If PocketBase has a valid auth store, sync it with our store
      if (pb.authStore.isValid && pb.authStore.record) {
        try {
          // Optimize by not expanding items on init - load them separately if needed
          const record = await pb
            .collection<Profile>('users')
            .getOne(pb.authStore.record.id)

          set(() => ({
            user: record,
          }))
        } catch (error) {
          console.error('Failed to sync user state:', error)
          // If we can't get the user record, clear the auth store
          pb.authStore.clear()
          set(() => ({
            user: null,
          }))
        }
      } else {
        // No valid auth, mark as initialized with no user
        set(() => ({
          user: null,
        }))
      }
    } catch (error) {
      console.error('Init error:', error)
      set(() => ({
        user: null,
      }))
    }
  },
  //
  //
  //
  updateStagedUser: (formFields: Partial<Profile>) => {
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
      const pb = getPocketBase()
      if (!pb) {
        throw new Error('PocketBase not available')
      }

      if (!pb.authStore.record) {
        throw new Error('not logged in')
      }

      const record = await pb
        .collection<UsersRecord>('users')
        .update(pb.authStore.record.id, { ...fields })

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
    const pb = getPocketBase()
    if (!pb) {
      throw new Error('PocketBase not available')
    }

    const userRecord = await pb
      .collection<Profile>('users')
      .getFirstListItem(`userName = "${userName}"`)
    return userRecord
  },
  getUsersByIds: async (ids: string[]) => {
    const pb = getPocketBase()
    if (!pb) {
      throw new Error('PocketBase not available')
    }

    const filter = ids.map((id) => `id="${id}"`).join(' || ')
    return await pb.collection('users').getFullList<Profile>({
      filter: filter,
    })
  },
  getRandomUser: async () => {
    const pb = getPocketBase()
    if (!pb) {
      throw new Error('PocketBase not available')
    }

    const result = await pb.collection('users').getList<Profile>(1, 1, {
      filter: 'items:length > 5',
      sort: '@random',
    })
    return result.items[0]
  },
  //
  // Requirement: staged user
  //
  register: async () => {
    // const app = await appPromise
    const finalUser = { ...get().stagedUser, emailVisibility: true }

    if (!finalUser) throw Error('No user data')
    if (!finalUser.email) throw Error('User must have email')

    const userPassword = get().stagedUser.password
    if (!userPassword) throw Error('User must have password')

    // Generate a username
    if (!finalUser.userName) {
      const firstNamePart = finalUser.firstName ? finalUser.firstName.toLowerCase() : 'user'
      const shortUuid = Math.random().toString(36).substring(2, 6)
      finalUser.userName = `${firstNamePart}-${shortUuid}`
    }

    try {
      const pb = getPocketBase()
      if (!pb) {
        throw new Error('PocketBase not available')
      }

      const record = await pb
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
    const pb = getPocketBase()
    if (!pb) {
      throw new Error('PocketBase not available')
    }

    const response = await pb
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
      const pb = getPocketBase()
      if (!pb) {
        throw new Error('PocketBase not available')
      }

      const record = await pb
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
      await pb.collection('users').authWithPassword(record.email, password)

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
    const pb = getPocketBase()
    if (pb) {
      pb.realtime.unsubscribe()
      pb.authStore.clear()
    }
  },
})
