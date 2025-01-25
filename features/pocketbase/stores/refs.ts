import { RecordModel } from 'pocketbase'
import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { StagedRef } from './types'

// ***
// Refs
//
//
export const useRefStore = create<{
  refs: RecordModel[]
  push: (stagedRef: StagedRef) => Promise<RecordModel>
  addMetaData: (
    id: string,
    { cat, meta }: { cat: string; meta: string }
  ) => Promise<RecordModel | void>
}>((set) => ({
  refs: [],
  push: async (stagedRef: StagedRef) => {
    console.log('STAGED REF', stagedRef)
    const record = await pocketbase.collection('refs').create(stagedRef)
    console.log('REF RECORD,', record)

    set((state) => ({
      refs: [...state.refs, record],
    }))

    return record
  },
  // Reference an existing Ref, and create an ref off it
  reference: () => {},
  addMetaData: async (id: string, { cat, meta }: { cat: string; meta: string }) => {
    try {
      const updatedRecord = await pocketbase.collection('refs').update(id, { type: cat, meta })
      return updatedRecord
    } catch (error) {
      console.error(error)
    }
  },
  remove: async (id: string) => {
    await pocketbase.collection('refs').delete(id)
    set((state) => ({
      refs: [...state.refs.filter((i) => i.id !== id)],
    }))
  },
}))
