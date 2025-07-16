import { pocketbase } from '../pocketbase'
import { StateCreator } from 'zustand'
import { Profile, ExpandedProfile, StagedProfileFields } from '../types'
import { UsersRecord } from '../pocketbase/pocketbase-types'
import type { StoreSlices } from './types'
import type { SessionSigner } from '@canvas-js/interfaces'
import { canvasApp, canvasTopic } from '../canvas/state'
import RefsContract from '../canvas/contract'

export type UserSlice = {
  stagedProfileFields: StagedProfileFields
  user: Profile | null
  isInitialized: boolean
  register: () => Promise<ExpandedProfile>
  updateUser: (fields: Partial<Profile>) => Promise<Profile>
  updateStagedProfileFields: (formFields: StagedProfileFields) => void
  getUserByUserName: (userName: string) => Promise<Profile>
  getUsersByIds: (ids: string[]) => Promise<Profile[]>
  getRandomUser: () => Promise<Profile>
  login: (sessionSigner: SessionSigner) => Promise<void>
  sessionSigner: SessionSigner | null
  setSessionSigner: (signer: SessionSigner) => void

  logout: () => void
  init: () => Promise<void>
}

export const createUserSlice: StateCreator<StoreSlices, [], [], UserSlice> = (set, get) => ({
  stagedProfileFields: {},
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
  updateStagedProfileFields: (formFields: StagedProfileFields) => {
    set((state) => ({
      stagedProfileFields: { ...state.stagedProfileFields, ...formFields },
    }))
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

      return record
    } catch (err) {
      console.error(err)
      throw err
    }
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
      await canvasApp.actions.createProfile({
        id: finalUser.id,
        firstName: finalUser.firstName,
        lastName: finalUser.lastName,
        location: finalUser.location,
        image: finalUser.image,
      })

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
  login: async (sessionSigner: SessionSigner) => {
    // request a session
    await sessionSigner.newSession(canvasTopic)

    // get the profile from modeldb
    const userDid = await sessionSigner.getDid()
    const profile = (await canvasApp.db.get(
      'profile',
      userDid
    )) as typeof RefsContract.models.profile

    if (!profile) {
      throw new Error('Profile not found')
    }

    set({
      user: profile,
      sessionSigner,
    })
  },
  sessionSigner: null,
  setSessionSigner: (signer: SessionSigner) => {
    set({ sessionSigner: signer })
  },
  //
  //
  //
  logout: () => {
    set(() => ({
      user: null,
      sessionSigner: null,
      stagedUser: {},
      isInitialized: true,
    }))

    pocketbase.realtime.unsubscribe()
    pocketbase.authStore.clear()
  },
})
