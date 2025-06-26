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
  push: (stagedRef: StagedRef) => Promise<RecordModel>
  updateOne: (id: string, fields: Partial<StagedRef>) => Promise<RecordModel>
}>((set) => ({
  push: async (stagedRef: StagedRef) => {
    const record = await pocketbase.collection('refs').create(stagedRef)
    await canvasApp.actions.pushRef({ ...stagedRef, id: record.id })

    return record
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
}))
