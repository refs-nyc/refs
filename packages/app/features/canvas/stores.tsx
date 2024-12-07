import { create } from 'zustand'
import { appPromise } from 'app/features/canvas/contract'

// ***
// Refs
//
//
export const useRefStore = create((set) => ({
  refs: [],
  push: async (newRef: StagedRef) => {
    const app = await appPromise

    const finalRef = await app.actions.createRef(newRef)
    console.log('coming from app actions')
    console.log(finalRef)
    // const finalRef = {
    //   ...newRef,
    //   id: Math.random(),
    // } // will be replaced by canvas

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
  push: async (newItem: Item) => {
    const finalItem = { ...newItem, id: Math.random() } // will be replaced by canvas
    await set((state) => ({ items: [...state.items, finalItem] }))
    return finalItem
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
// Combined actions
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

  const newItem = await itemStore.push({
    ...copiedRef,
    id: Math.random(),
    ref: newRef.id,
    createdAt: Date.now(),
  })

  return { ref: newRef, item: newItem }
}
