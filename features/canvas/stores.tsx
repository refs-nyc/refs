import { create } from 'zustand'
import Pocketbase from 'pocketbase'

export const pocketbase = new Pocketbase('https://refs.enabler.space')

// const test = async () => {
//   try {
//     const record = await pocketbase
//       .collection('profiles')
//       .create({ userName: 'manegame', firstName: 'M', lastName: 'N' })

//
//   } catch (error) {
//
//
//   }
// }

// test()

// import { appPromise } from '@/features/canvas/provider'

// ***
// Profiles
//
//
export const useProfileStore = create((set, get) => ({
  stagedProfile: {},
  userProfile: {},
  profiles: [],
  //
  updateStagedProfile: (formFields: any) => {
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
      const record = await pocketbase.collection('profiles').create(finalProfile)

      set(() => ({
        userProfile: finalProfile,
      }))
      return record.id
    } catch (error) {}
  },
  //
  //
  //
  login: async (userName: string) => {
    try {
      const record = await pocketbase
        .collection('profiles')
        .getFirstListItem(`userName = "${userName}"`, { expand: 'items,items.ref' })

      set(() => ({
        userProfile: record,
      }))
      return record
    } catch (error) {
      throw new Error(error)
    }
  },
  //
  //
  //
  attachItem: async (itemId: string) => {
    const userProfile = get().userProfile
    if (!userProfile.id) throw Error('Not logged in')

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

// ***
// Refs
//
//
export const useRefStore = create((set) => ({
  refs: [],
  push: async (stagedRef: StagedRef) => {
    const record = await pocketbase.collection('refs').create(stagedRef)

    set((state) => ({
      refs: [...state.refs, record],
    }))

    return record
  },
  // Reference an existing Ref, and create an ref off it
  reference: () => {},
  remove: async (id) => {
    await pocketbase.collection('refs').delete(id)
    set((state) => ({
      refs: [...state.refs.filter((i) => i.id !== id)],
    }))
  },
}))

// ***
// Items
//
//
export const useItemStore = create((set) => ({
  items: [],
  // 1. Create a new Ref
  // 2. Attach Ref to Item and create
  push: async (newItem: StagedItem) => {
    const record = await pocketbase.collection('items').create(newItem, { expand: 'ref' })

    set((state) => {
      const newItems = [...state.items, record]
      return { items: newItems }
    })

    return record
  },
  // Reference an existing Ref, and create an item off it
  reference: () => {},
  remove: (id) => {
    set((state) => ({
      items: [...state.items.filter((i) => i.id !== id)],
    }))
  },
}))

// ***
// Create Ref with Item
//
//
export const createRefWithItem = async (stagedRef: StagedRef) => {
  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()
  const profileStore = useProfileStore.getState()

  const newRef = await refStore.push(stagedRef)

  const copiedRef = { ...newRef }

  delete copiedRef.firstReferral
  delete copiedRef.referrals

  const newItem = await itemStore.push({
    ...copiedRef,
    backlog: stagedRef?.backlog,
    ref: newRef.id,
  })

  // If the userProfile is set, attach item ID to items
  if (profileStore.userProfile) {
    await profileStore.attachItem(newItem.id)
  }

  return { ref: newRef, item: newItem }
}
