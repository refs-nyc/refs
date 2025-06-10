import { pocketbase } from '../pocketbase'
import { RecordModel } from 'pocketbase'
import { create } from 'zustand'
import { StagedItem, Item, ExpandedItem, CompleteRef } from './types'
import { ItemsRecord } from './pocketbase-types'
import { canvasApp } from './canvas'
import { createdSort } from '@/ui/profiles/sorts'

function gridSort(items: ExpandedItem[]): ExpandedItem[] {
  const itemsWithOrder: ExpandedItem[] = []
  const itemsWithoutOrder: ExpandedItem[] = []

  for (const item of items) {
    if (item.order !== 0) {
      itemsWithOrder.push(item)
    } else {
      itemsWithoutOrder.push(item)
    }
  }
  // if items have an order value, sort them by order
  itemsWithOrder.sort((a, b) => a.order - b.order)
  // otherwise sort them by created date
  itemsWithoutOrder.sort(createdSort)
  return [...itemsWithOrder, ...itemsWithoutOrder]
}

// ***
// Items
//
//
export const useItemStore = create<{
  items: Item[]
  editing: string
  addingToList: boolean
  searchingNewRef: string
  editedState: Partial<ExpandedItem>
  editingLink: boolean
  feedRefreshTrigger: number
  setEditingLink: (newValue: boolean) => void
  startEditing: (id: string) => void
  setAddingToList: (newValue: boolean) => void
  setSearchingNewRef: (id: string) => void
  stopEditing: () => void
  push: (newItem: StagedItem) => Promise<ExpandedItem>
  addItemToList: (listId: string, itemId: string) => Promise<void>
  update: (id?: string) => Promise<RecordModel>
  updateEditedState: (e: Partial<ExpandedItem>) => void
  remove: (id: string) => Promise<void>
  moveToBacklog: (id: string) => Promise<ItemsRecord>
  triggerFeedRefresh: () => void
}>((set, get) => ({
  items: [],
  addingToList: false,
  editing: '',
  searchingNewRef: '', // the id to replace the ref for
  editedState: {},
  editingLink: false,
  feedRefreshTrigger: 0,
  setEditingLink: (newValue: boolean) => set(() => ({ editingLink: newValue })),
  startEditing: (id: string) => set(() => ({ editing: id })),
  setAddingToList: (newValue: boolean) => set(() => ({ addingToList: newValue })),
  setSearchingNewRef: (id: string) => set(() => ({ searchingNewRef: id })),
  stopEditing: () =>
    set(() => {
      return { editing: '', editedState: {}, searchingNewRef: '', editingLink: false }
    }),
  updateEditedState: (editedState: Partial<CompleteRef>) =>
    set(() => ({
      ...get().editedState,
      editedState,
    })),
  triggerFeedRefresh: () => set((state) => ({ feedRefreshTrigger: state.feedRefreshTrigger + 1 })),
  push: async (newItem: StagedItem) => {
    console.log('ITEMS PUSH')
    try {
      const record = await pocketbase
        .collection('items')
        .create<ExpandedItem>(newItem, { expand: 'ref' })
      await canvasApp.actions.pushItem({ ...newItem, id: record.id })

      set((state) => {
        const newItems = [...state.items, record]
        return { items: newItems, feedRefreshTrigger: state.feedRefreshTrigger + 1 }
      })

      console.log('PUSHED ItEM', record)

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  remove: async (id: string): Promise<void> => {
    await pocketbase.collection('items').delete(id)
    await canvasApp.actions.removeItem(id)

    set((state) => ({
      items: [...state.items?.filter((i) => i.id !== id)],
      feedRefreshTrigger: state.feedRefreshTrigger + 1,
    }))
  },
  addItemToList: async (listId: string, itemId: string) => {
    try {
      await pocketbase
        .collection('items')
        .update(itemId, { 'parent': listId })
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  update: async (id?: string) => {
    try {
      const record = await pocketbase
        .collection('items')
        .update(id || get().editing, get().editedState, { expand: 'children,ref' })
      // Canvas stuff

      // Trigger feed refresh since updates might affect feed visibility
      get().triggerFeedRefresh()

      return record
    } catch (e) {
      console.error(e)
      throw e
    }
  },
  moveToBacklog: async (id: string) => {
    try {
      const record = await pocketbase.collection<ItemsRecord>('items').update(id, { backlog: true })
      //await canvasApp.actions.moveItemToBacklog(id)

      // Trigger feed refresh since backlog items don't appear in the feed
      get().triggerFeedRefresh()

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
}))

export const getProfileItems = async (userName: string) => {
  const items = await pocketbase.collection<ExpandedItem>('items').getFullList({
    filter: pocketbase.filter('creator.userName = {:userName} && backlog = false && parent = null', {
      userName,
    }),
    expand: 'items_via_parent, ref, items_via_parent.ref',
  })
  return gridSort(items)
}

export const getBacklogItems = async (userName: string) => {
  const items = await pocketbase.collection('items').getFullList({
    filter: pocketbase.filter('creator.userName = {:userName} && backlog = true && parent = null', {
      userName,
    }),
    expand: 'children, ref',
  })
  return items.sort(createdSort)
}
