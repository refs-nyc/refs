import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { Profile, ExpandedProfile } from './types'
import { UsersRecord } from './pocketbase-types'
import { canvasApp } from './canvas'
import { ClientResponseError } from 'pocketbase'

export const useUserStore = create<{
  stagedUser: Partial<Profile>
  user: Profile | null
  isInitialized: boolean
  register: () => Promise<ExpandedProfile>
  updateUser: (fields: Partial<Profile>) => Promise<Profile>
  updateStagedUser: (formFields: Partial<Profile>) => void
  loginWithPassword: (email: string, password: string) => Promise<any>
  getUserByEmail: (email: string) => Promise<Profile>
  login: (userName: string) => Promise<Profile>
  logout: () => void
  init: () => Promise<void>
}>((set, get) => ({
  stagedUser: {},
  user: null, // user is ALWAYS the user of the app, this is only set if the user is logged in
  isInitialized: false,
  //
  //
  //
  init: async () => {
    try {
      // If PocketBase has a valid auth store, sync it with our store
      if (pocketbase.authStore.isValid && pocketbase.authStore.record) {
        try {
          const record = await pocketbase
            .collection<Profile>('users')
            .getOne(pocketbase.authStore.record.id, { expand: 'items,items.ref' })

          set(() => ({
            user: record,
            isInitialized: true,
          }))
        } catch (error) {
          console.error('Failed to sync user state:', error)
          // If we can't get the user record, clear the auth store
          pocketbase.authStore.clear()
          set(() => ({
            user: null,
            isInitialized: true,
          }))
        }
      } else {
        // No valid auth, mark as initialized with no user
        set(() => ({
          user: null,
          isInitialized: true,
        }))
      }
    } catch (error) {
      console.error('Init error:', error)
      set(() => ({
        user: null,
        isInitialized: true,
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
      if (!pocketbase.authStore.record) {
        throw new Error('not logged in')
      }

      const record = await pocketbase
        .collection<UsersRecord>('users')
        .update(pocketbase.authStore.record.id, { ...fields })

      await canvasApp.actions.updateUser(pocketbase.authStore.record.id, fields)

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
      const record = await pocketbase
        .collection('users')
        .create<ExpandedProfile>(finalUser, { expand: 'items,items.ref' })

      await get().loginWithPassword(finalUser.email, userPassword)

      if (pocketbase?.authStore?.record?.id) {
        await canvasApp.actions.registerUser({
          id: pocketbase.authStore.record.id,
          ...finalUser,
          email: '',
          password: '',
          tokenKey: '',
          userName: record.userName,
        })
      }

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
    pocketbase.realtime.unsubscribe()
    pocketbase.authStore.clear()
  },
}))
