import { create } from 'zustand'
import { appPromise } from '@/features/canvas/provider'

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
    const app = await appPromise

    try {
      const {
        result: { did },
      } = await app.actions.createProfile(get().stagedProfile)
      const finalProfile = await app.db.get('profiles', did)

      set(() => ({
        userProfile: finalProfile,
      }))
      return finalProfile
    } catch (error) {
      console.error(error)
    }
  },
}))

// ***
// Refs
//
//
export const useRefStore = create((set) => ({
  refs: [],
  push: async (newRef: StagedRef) => {
    const app = await appPromise

    const { result: id } = await app.actions.createRef(newRef)
    const finalRef = await app.db.get('refs', id)

    set((state) => ({ refs: [...state.refs, finalRef] }))
    return finalRef
  },
  // Reference an existing Ref, and create an ref off it
  reference: () => {},
  remove: (id) => {
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
    const app = await appPromise

    const { result: id } = await app.actions.createItem(newItem)
    const finalItem = await app.db.get('items', id)
    if (finalItem === null) throw new Error('Could not fetch Item')
    const ref = await app.db.get('refs', finalItem.ref)
    if (ref === null) throw new Error('Could not fetch Ref')
    const joinedItem = { ...finalItem, title: ref.title, image: ref.image }

    console.log(joinedItem)

    set((state) => {
      const newItems = [...state.items, joinedItem]
      return { items: newItems }
    })

    return joinedItem
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
export const createRefWithItem = async (stagedRef: StagedRef): { ref: CompleteRef; item: Item } => {
  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()

  const newRef = await refStore.push(stagedRef)

  const copiedRef = { ...newRef }

  delete copiedRef.id
  delete copiedRef.firstReferral
  delete copiedRef.referrals
  delete copiedRef.createdAt
  delete copiedRef.deletedAt

  const newItem = await itemStore.push({
    ref: newRef.id,
  })

  console.log({ ref: newRef, item: newItem })

  return { ref: newRef, item: newItem }
}
