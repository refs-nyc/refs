import '../../../ui/src/global.d.ts'
import { create } from 'zustand'

export const models = {
  profiles: {
    did: 'primary',
    firstName: 'string',
    lastName: 'string',
    userName: 'string',
    location: 'string?',
    geolocation: 'string?',
    image: 'string?',
    items: '@items[]',
  },

  // Canonical information

  refs: {
    id: 'primary',
    title: 'string',
    createdAt: 'number',
    firstReferral: '@profile?',
    image: 'string?',
    location: 'string?',
    deletedAt: 'number?',
    referrals: '@profiles[]',
  },

  // Copies of above

  items: {
    id: 'primary',
    ref: '@refs',
    createdAt: 'number',
    image: 'string?',
    location: 'string?',
    text: 'string?',
    url: 'string?',
    children: '@items[]',
    deletedAt: 'number?',
  },

  // Later, @raymond to rewrite: https://docs.canvas.xyz/examples-encrypted-chat.html

  messages: {
    id: 'primary', // id should always be `${userA}/${userB}` where userA is lexicographically first compared to userB
    message: 'string',
    createdAt: 'number',
  },
} as const

// export const useProfileStore = create((set) => ({
//   profile: null,
//   provision: () => {
//     set((state) => ({ profile: }))
//   }
// }))

// ***
// Refs
//
//
export const useRefStore = create((set) => ({
  refs: [],
  push: (newRef: StagedRef) => {
    const finalRef = {
      ...newRef,
      id: Math.random(),
    } // will be replaced by canvas
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
  push: (newItem: Item) => {
    const finalItem = { ...newItem, id: Math.random() } // will be replaced by canvas
    set((state) => ({ items: [...state.items, finalItem] }))
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
export const createRefWithItem = (stagedRef: StagedRef): { ref: CompleteRef; item: Item } => {
  const refStore = useRefStore.getState()
  const itemStore = useItemStore.getState()

  const newRef = refStore.push(stagedRef)
  const copiedRef = { ...newRef }

  delete copiedRef.id
  delete copiedRef.firstReferral
  delete copiedRef.referrals

  const newItem = itemStore.push({
    ...copiedRef,
    id: Math.random(),
    ref: newRef.id,
    createdAt: Date.now(),
  })

  return { ref: newRef, item: newItem }
}
