import { pocketbase } from '../pocketbase'
import { RecordModel } from 'pocketbase'
import { create } from 'zustand'
import { StagedItem, ExpandedItem, CompleteRef, StagedRef } from './types'
import { ItemsRecord } from './pocketbase-types'
import { canvasApp } from './canvas'
import { createdSort } from '@/ui/profiles/sorts'

function gridSort(items: ExpandedItem[]): ExpandedItem[] {
  // If items are already sorted by order and created, we can optimize
  if (items.length <= 1) return items
  
  const itemsWithOrder: ExpandedItem[] = []
  const itemsWithoutOrder: ExpandedItem[] = []

  for (const item of items) {
    if (item.order !== 0) {
      itemsWithOrder.push(item)
    } else {
      itemsWithoutOrder.push(item)
    }
  }
  
  // Sort items with order
  if (itemsWithOrder.length > 1) {
    itemsWithOrder.sort((a, b) => a.order - b.order)
  }
  
  // Sort items without order (they should already be sorted by created from the query)
  // Only sort if we have multiple items and they're not already in the right order
  if (itemsWithoutOrder.length > 1) {
    // Check if they're already sorted by created date
    let needsSorting = false
    for (let i = 1; i < itemsWithoutOrder.length; i++) {
      if (new Date(itemsWithoutOrder[i-1].created) < new Date(itemsWithoutOrder[i].created)) {
        needsSorting = true
        break
      }
    }
    if (needsSorting) {
      itemsWithoutOrder.sort(createdSort)
    }
  }
  
  return [...itemsWithOrder, ...itemsWithoutOrder]
}

// ***
// Items Store
// ***
export const useItemStore = create<{
  editing: string
  addingToList: boolean
  searchingNewRef: string
  editedState: Partial<ExpandedItem & { listTitle: string }>
  editingLink: boolean
  feedRefreshTrigger: number
  profileRefreshTrigger: number
  setEditingLink: (newValue: boolean) => void
  startEditing: (id: string) => void
  setAddingToList: (newValue: boolean) => void
  setSearchingNewRef: (id: string) => void
  stopEditing: () => void
  push: (newItem: StagedItem) => Promise<ExpandedItem>
  addItemToList: (listId: string, itemId: string) => Promise<void>
  update: (id?: string) => Promise<RecordModel>
  updateEditedState: (e: Partial<ExpandedItem & { listTitle: string }>) => void
  remove: (id: string) => Promise<void>
  moveToBacklog: (id: string) => Promise<ItemsRecord>
  triggerFeedRefresh: () => void
  triggerProfileRefresh: () => void
  pushRef: (stagedRef: StagedRef) => Promise<RecordModel>
  updateOneRef: (id: string, fields: Partial<StagedRef>) => Promise<RecordModel>
}>((set, get) => ({
  addingToList: false,
  editing: '',
  searchingNewRef: '', // the id to replace the ref for
  editedState: {},
  editingLink: false,
  feedRefreshTrigger: 0,
  profileRefreshTrigger: 0,
  
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
  triggerProfileRefresh: () =>
    set((state) => ({ profileRefreshTrigger: state.profileRefreshTrigger + 1 })),
    
  push: async (newItem: StagedItem) => {
    try {
      const record = await pocketbase
        .collection('items')
        .create<ExpandedItem>(newItem, { expand: 'ref' })
      await canvasApp.actions.pushItem({ ...newItem, id: record.id })

      set((state) => ({ feedRefreshTrigger: state.feedRefreshTrigger + 1 }))

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  
  remove: async (id: string): Promise<void> => {
    const item = await pocketbase.collection('items').getOne(id)
    if (item.list) {
      const children = await pocketbase
        .collection('items')
        .getFullList({ filter: `parent = "${id}"` })
      for (const child of children) {
        await pocketbase.collection('items').delete(child.id)
      }
    }
    await pocketbase.collection('items').delete(id)
    await canvasApp.actions.removeItem(id)

    set((state) => ({
      feedRefreshTrigger: state.feedRefreshTrigger + 1,
    }))
  },
  
  addItemToList: async (listId: string, itemId: string) => {
    try {
      await pocketbase.collection('items').update(itemId, { parent: listId })
      // newly created item might appear in feed before it is added to a list
      // so we should refresh after choosing a list
      // (because currently we are filtering out list children from feed)
      get().triggerFeedRefresh()
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

      if (get().editedState.listTitle && record.list) {
        const ref = await pocketbase
          .collection('refs')
          .update(record.ref, { title: get().editedState.listTitle })
        if (record.expand?.ref) record.expand.ref = ref
      }
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
  
  pushRef: async (stagedRef: StagedRef) => {
    const record = await pocketbase.collection('refs').create(stagedRef)
    await canvasApp.actions.pushRef({ ...stagedRef, id: record.id })

    return record
  },
  
  updateOneRef: async (id: string, fields: Partial<StagedRef>) => {
    try {
      const record = await pocketbase.collection('refs').update(id, { ...fields })
      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
}))

// Helper function to get profile items
export const getProfileItems = async (userName: string) => {
  const startTime = Date.now()
  console.log('🔄 getProfileItems starting for:', userName)
  
  try {
    // First, get the user to get their ID
    const user = await pocketbase
      .collection('users')
      .getFirstListItem(`userName = "${userName}"`)
    
    console.log(`📊 User fetch took ${Date.now() - startTime}ms`)
    console.log(`📊 User found:`, user?.userName, user?.id)
    
    // Then get items without expand first
    const itemsQueryStart = Date.now()
    const filter = `creator = "${user.id}" && backlog = false && parent = null`
    console.log(`📊 Using filter:`, filter)
    
    const items = await pocketbase.collection<ExpandedItem>('items').getFullList({
      filter: filter,
      fields: 'id,order,created,ref',
      sort: 'order,created',
    })
    
    const itemsQueryTime = Date.now() - itemsQueryStart
    console.log(`📊 Items query took ${itemsQueryTime}ms, got ${items.length} items`)
    console.log(`📊 Items:`, items.map(item => ({ id: item.id, ref: item.ref, order: item.order })))
    
    // Then get refs separately if needed
    if (items.length > 0) {
      const refIds = [...new Set(items.map(item => item.ref).filter(Boolean))]
      const refsQueryStart = Date.now()
      
      const refs = await pocketbase.collection('refs').getFullList({
        filter: refIds.map(id => `id = "${id}"`).join(' || '),
        fields: 'id,title,image',
      })
      
      const refsQueryTime = Date.now() - refsQueryStart
      console.log(`📊 Refs query took ${refsQueryTime}ms, got ${refs.length} refs`)
      
      // Create a map of refs for quick lookup
      const refsMap = new Map(refs.map(ref => [ref.id, ref]))
      
      // Attach refs to items
      const itemsWithRefs = items.map(item => ({
        ...item,
        expand: {
          ref: refsMap.get(item.ref)
        }
      }))
      
      const sortStartTime = Date.now()
      const sortedItems = gridSort(itemsWithRefs)
      const sortTime = Date.now() - sortStartTime
      console.log(`📊 gridSort took ${sortTime}ms`)
      
      const totalTime = Date.now() - startTime
      console.log(`✅ getProfileItems total time: ${totalTime}ms`)
      
      return sortedItems
    } else {
      const totalTime = Date.now() - startTime
      console.log(`✅ getProfileItems total time: ${totalTime}ms (no items)`)
      return []
    }
  } catch (error) {
    console.error('❌ getProfileItems error:', error)
    const totalTime = Date.now() - startTime
    console.log(`❌ getProfileItems failed after ${totalTime}ms, returning empty array`)
    return [] // Return empty array instead of throwing
  }
}

export const getBacklogItems = async (userName: string) => {
  try {
    const user = await pocketbase
      .collection('users')
      .getFirstListItem(`userName = "${userName}"`)
    
    const items = await pocketbase.collection<ExpandedItem>('items').getFullList({
      filter: `creator = "${user.id}" && backlog = true`,
      expand: 'ref',
      sort: '-created',
    })
    
    return items
  } catch (error) {
    console.error('Error getting backlog items:', error)
    throw error
  }
}
