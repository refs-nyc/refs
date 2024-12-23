import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { Profile, EmptyProfile } from './types'
import { ClientResponseError } from 'pocketbase'

export const useProfileStore = create<{
  stagedProfile?: Partial<Profile>
  userProfile?: Profile | EmptyProfile
  profiles?: Profile[]
  register: () => Promise<Profile>
}>((set, get) => ({
  stagedProfile: {},
  userProfile: {},
  profiles: [],
  //
  updateStagedUser: (formFields: any) => {
    set((state) => ({
      stagedProfile: { ...state.stagedProfile, ...formFields },
    }))

    const updatedState = get().stagedProfile

    return updatedState
  },
  //
  // Requirement: staged profile
  //
  register: async () => {
    // const app = await appPromise

    try {
      const finalProfile = get().stagedProfile

      const record = await pocketbase
        .collection<Profile>('profiles')
        .create(finalProfile, { expand: 'items,items.ref' })

      set(() => ({
        userProfile: record,
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
  login: async (userName: string) => {
    try {
      const record = await pocketbase
        .collection<Profile>('profiles')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

      set(() => ({
        userProfile: record,
      }))
      return record
    } catch (error) {
      if ((error as ClientResponseError).status == 404) {
        try {
          const record = await get().register()

          set(() => ({
            userProfile: record,
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
  attachItem: async (itemId: string) => {
    const userProfile = get().userProfile
    if (!userProfile || !('id' in userProfile)) throw Error('Not logged in')

    try {
      const updatedRecord = await pocketbase
        .collection('profiles')
        .update(userProfile.id, { '+items': itemId }, { expand: 'items,items.ref' })

      set(() => ({
        userProfile: updatedRecord,
      }))

      return updatedRecord
    } catch (error) {}
  },
}))
