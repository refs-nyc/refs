import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { StagedItem, Item, ExpandedItem, CompleteRef } from './types'
import { ItemsRecord } from "./pocketbase-types"

// ***
// Items
//
//
export const useItemStore = create<{
  items: Item[]
  push: (newItem: StagedItem) => Promise<ExpandedItem>
  addToList: (id: string, ref: CompleteRef) => Promise<Item>
  removeFromList: (id: string, ref: CompleteRef) => Promise<Item>
  reference: () => void
  remove: (id: string) => void
  moveToBacklog: (id: string) => Promise<ItemsRecord>
}>((set) => ({
  items: [],
  push: async (newItem: StagedItem) => {
    console.log('ITEMS PUSH')
    try {
      const record = await pocketbase.collection('items').create<ExpandedItem>(newItem, { expand: 'ref' })
      set((state) => {
        const newItems = [...state.items, record]
        return { items: newItems }
      })

      console.log('PUSHED ItEM', record)

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  // Reference an existing Ref, and create an item off it
  reference: () => {},
  remove: async (id: string) => {
    await pocketbase.collection('items').delete(id)
    set((state) => ({
      items: [...state.items.filter((i) => i.id !== id)],
    }))
  },
  addToList: async (id: string, ref: CompleteRef) => {
    try {
      const record = await pocketbase
        .collection('items')
        .update(id, { '+children': ref.id, expand: 'children' })

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  removeFromList: async (id: string, ref: CompleteRef) => {
    try {
      const record = await pocketbase
        .collection('items')
        .update(id, { 'children-': ref.id, expand: 'children' })

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  moveToBacklog: async (id: string) => {
    try {
      const record = await pocketbase.collection<ItemsRecord>('items').update(id, { backlog: true })

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
}))
