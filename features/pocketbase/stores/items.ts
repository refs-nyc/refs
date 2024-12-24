import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { StagedItem, Item } from './types'

// ***
// Items
//
//
export const useItemStore = create<{
  items: Item[]
  push: (newItem: StagedItem) => Promise<Item>
  reference: () => void
  remove: (id: string) => void
}>((set) => ({
  items: [],
  // 1. Create a new Ref
  // 2. Attach Ref to Item and create
  push: async (newItem: StagedItem) => {
    console.log('new ref')
    const record = await pocketbase.collection<Item>('items').create(newItem, { expand: 'ref' })

    set((state) => {
      const newItems = [...state.items, record]
      return { items: newItems }
    })

    return record
  },
  // Reference an existing Ref, and create an item off it
  reference: () => {},
  remove: async (id: string) => {
    await pocketbase.collection('items').delete(id)
    set((state) => ({
      items: [...state.items.filter((i) => i.id !== id)],
    }))
  },
  moveToBacklog: async (id: string) => {
    try {
      const record = await pocketbase.collection('items').update(id, { backlog: true })

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
}))
