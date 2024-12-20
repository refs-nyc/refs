import { pocketbase } from '../pocketbase'
import { create } from 'zustand'

export const useUserStore = create((set, get) => ({
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
    const userRecord = await pocketbase.collection('users').getFirstListItem(`email = "${email}"`)
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
        .collection('users')
        .create(finalUser, { expand: 'items,items.ref' })

      set(() => ({
        user: record,
      }))
      return record
    } catch (error) {
      console.error(error)
    }
  },
  loginWithPassword: async (email: string, password: string) => {
    try {
      const record = await pocketbase.collection('users').authWithPassword(email, password)
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
        .collection('users')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

      set(() => ({
        user: record,
      }))
      return record
    } catch (error) {
      if (error.status == 404) {
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
        .collection('users')
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
