import { RecordModel } from 'pocketbase'
import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { StagedRef } from './types'
import { canvasApp } from './canvas'

// ***
// Refs
//
//
export const useRefStore = create<{
  refs: RecordModel[]
  push: (stagedRef: StagedRef) => Promise<RecordModel>
  updateOne: (id: string, fields: Partial<StagedRef>) => Promise<RecordModel>
  addMetaData: (
    id: string,
    { location, author }: { location?: string; author?: string }
  ) => Promise<RecordModel | void>
}>((set) => ({
  refs: [],
  push: async (stagedRef: StagedRef) => {
    const record = await pocketbase.collection('refs').create(stagedRef)
    await canvasApp.actions.pushRef({ ...stagedRef, id: record.id })

    set((state) => ({
      refs: [...state.refs, record],
    }))

    return record
  },
  // Reference an existing Ref, and create an ref off it
  reference: () => {},
  addMetaData: async (id: string, { location, author }: { location?: string; author?: string }) => {
    try {
      const updatedRecord = await pocketbase.collection('refs').update(id, { location, author })
      await canvasApp.actions.addRefMetadata(id, { location: location ?? '', author: author ?? '' })
      return updatedRecord
    } catch (error) {
      console.error(error)
    }
  },
  updateOne: async (id: string, fields: Partial<StagedRef>) => {
    try {
      const record = await pocketbase.collection('refs').update(id, { ...fields })
      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  remove: async (id: string) => {
    await pocketbase.collection('refs').delete(id)
    await canvasApp.actions.removeRef(id)

    set((state) => ({
      refs: [...state.refs.filter((i) => i.id !== id)],
    }))
  },
}))
