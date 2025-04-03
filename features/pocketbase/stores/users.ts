import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { Profile, EmptyProfile, ExpandedProfile, Item } from './types'
import { UsersRecord, UsersResponse, ItemsResponse } from './pocketbase-types'
import { canvasApp } from './canvas'
import { ClientResponseError } from 'pocketbase'
import { gridSort, createdSort } from '@/ui/profiles/sorts'

export const isProfile = (profile: Profile | EmptyProfile): profile is Profile => {
  return Object.keys(profile).length > 0
}

export const isExpandedProfile = (
  profile: ExpandedProfile | EmptyProfile
): profile is ExpandedProfile => {
  return Object.keys(profile).length > 0
}

export const useUserStore = create<{
  stagedUser: Partial<Profile>
  user: Profile | null
  profile: Profile | EmptyProfile
  profileItems: Item[]
  backlogItems: Item[]
  register: () => Promise<ExpandedProfile>
  getProfile: (userName: string) => Promise<ExpandedProfile>
  updateUser: (fields: Partial<Profile>) => Promise<Profile>
  updateStagedUser: (formFields: Partial<Profile>) => void
  attachItem: (itemId: string) => void
  loginWithPassword: (email: string, password: string) => Promise<any>
  getUserByEmail: (email: string) => Promise<Profile>
  login: (userName: string) => Promise<Profile>
  logout: () => void
  removeItem: (itemId: string) => Promise<ExpandedProfile>
}>((set, get) => ({
  stagedUser: {},
  user: null, // user is ALWAYS the user of the app, this is only set if the user is logged in
  profile: {}, // profile can be any page you are currently viewing
  profileItems: [],
  backlogItems: [],
  users: [],
  //
  //
  //
  getProfile: async (userName: string) => {
    try {
      const record = await pocketbase
        .collection('users')
        .getFirstListItem<ExpandedProfile>(`userName = "${userName}"`, {
          expand: 'items,items.ref,items.children',
        })

      set(() => ({
        profile: record,
        profileItems:
          record?.expand?.items?.filter((itm: Item) => !itm.backlog).sort(gridSort) || [],
        backlogItems:
          record?.expand?.items?.filter((itm: Item) => itm.backlog).sort(createdSort) || [],
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

      console.log('Updated user', fields)
      console.log(record)

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
    }))
    pocketbase.authStore.clear()
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
      await canvasApp.actions.attachItem(pocketbase.authStore.record.id, itemId)

      set(() => ({
        user: updatedRecord,
      }))

      return updatedRecord
    } catch (error) {
      throw error
    }
  },
  //
  //
  //
  removeItem: async (itemId: string) => {
    if (!pocketbase.authStore.isValid || !pocketbase.authStore.record) throw Error('Not logged in')

    try {
      const updatedRecord = await pocketbase
        .collection('users')
        .update<ExpandedProfile>(
          pocketbase.authStore.record.id,
          { 'items-': itemId },
          { expand: 'items,items.ref' }
        )
      await canvasApp.actions.removeUserItemAssociation(pocketbase.authStore.record.id, itemId)

      set(() => ({
        user: updatedRecord,
      }))

      return updatedRecord
    } catch (error) {
      throw error
    }
  },
}))
