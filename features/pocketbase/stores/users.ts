import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { Profile, EmptyProfile } from './types'
import { ClientResponseError } from 'pocketbase'

export const useUserStore = create<{
  stagedUser: Partial<Profile>
  user: Profile | EmptyProfile
  register: () => Promise<Profile>
  updateStagedUser: (formFields: any) => void
  loginWithPassword: (email: string, password: string) => void
  getUserByEmail: (email: string) => Promise<Profile>
  login: (userName: string) => Promise<Profile>
  logout: () => Promise<void>
}>((set, get) => ({
  stagedUser: {},
  user: {},
  users: [],
  //
  //
  //
  updateStagedUser: (formFields: any) => {
    set((state) => ({
      stagedUser: { ...state.stagedUser, ...formFields },
    }))

    const updatedState = get().stagedUser

    return updatedState
  },
  //
  //
  //
  getUserByEmail: async (email: string) => {
    const userRecord = await pocketbase.collection<Profile>('users').getFirstListItem(`email = "${email}"`)
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

    try {
      const record = await pocketbase
        .collection<Profile>('users')
        .create(finalUser, { expand: 'items,items.ref' })

      set(() => ({
        user: record,
      }))
      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  loginWithPassword: async (email: string, password: string) => {
    try {
      const record = await pocketbase.collection('users').authWithPassword(email, password)
      // TODO: unexpected
      set(() => ({
        user: record,
      }))
      return record
    } catch (error) {
      console.error(error)
    }
  },
  //
  //
  //
  login: async (userName: string) => {
    try {
      const record = await pocketbase
        .collection<Profile>('users')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

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
    }
  },
  //
  //
  //
  logout: async () => {
    set(() => ({
      stagedUser: {},
    }))
    await pocketbase.authStore.clear()
  },
  //
  //
  //
  attachItem: async (itemId: string) => {
    if (!pocketbase.authStore.isValid || !pocketbase.authStore.record) throw Error('Not logged in')

    try {
      const updatedRecord = await pocketbase
        .collection<Profile>('users')
        .update(pocketbase.authStore.record.id, { '+items': itemId }, { expand: 'items,items.ref' })

      set(() => ({
        user: updatedRecord,
      }))

      return updatedRecord
    } catch (error) {}
  },
  //
  //
  //
  removeItem: async (itemId: string) => {
    if (!pocketbase.authStore.isValid || !pocketbase.authStore.record) throw Error('Not logged in')

    try {
      const updatedRecord = await pocketbase
        .collection('users')
        .update(pocketbase.authStore.record.id, { 'items-': itemId }, { expand: 'items,items.ref' })

      set(() => ({
        user: updatedRecord,
      }))

      return updatedRecord
    } catch (error) {
      throw Error(error)
    }
  },
}))
