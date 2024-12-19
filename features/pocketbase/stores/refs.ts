import { pocketbase } from '../pocketbase'
import { create } from 'zustand'

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
