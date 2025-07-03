import { pocketbase } from '../pocketbase'
import { create } from 'zustand'
import { ExpandedItem, CompleteRef, StagedItemFields, StagedRefFields } from './types'
import { ItemsRecord } from './pocketbase-types'
import { createdSort } from '@/ui/profiles/sorts'
import { canvasApp } from '@/features/canvas'

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
  editing: string
  addingToList: boolean
  searchingNewRef: string
  editedState: {
    text?: string
    image?: string
    url?: string
    listTitle?: string
  }
  editingLink: boolean
  feedRefreshTrigger: number
  profileRefreshTrigger: number
  setEditingLink: (newValue: boolean) => void
  startEditing: (id: string) => void
  setAddingToList: (newValue: boolean) => void
  setSearchingNewRef: (id: string) => void
  stopEditing: () => void
  addToProfile: (
    refId: string | null,
    itemFields: StagedItemFields,
    backlog: boolean
  ) => Promise<ExpandedItem>
  createRef: (refFields: StagedRefFields) => Promise<CompleteRef>
  createItem: (
    refId: string,
    itemFields: StagedItemFields,
    backlog: boolean
  ) => Promise<ExpandedItem>
  addItemToList: (listId: string, itemId: string) => Promise<void>
  update: (id?: string) => Promise<ExpandedItem>
  updateEditedState: (e: Partial<ExpandedItem & { listTitle: string }>) => void
  removeItem: (id: string) => Promise<void>
  moveToBacklog: (id: string) => Promise<ItemsRecord>
  triggerFeedRefresh: () => void
  triggerProfileRefresh: () => void
  updateRefTitle: (id: string, title: string) => Promise<CompleteRef>
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
  updateEditedState: (editedState: {
    text?: string
    image?: string
    url?: string
    listTitle?: string
  }) =>
    set(() => ({
      ...get().editedState,
      editedState,
    })),
  triggerFeedRefresh: () => set((state) => ({ feedRefreshTrigger: state.feedRefreshTrigger + 1 })),
  triggerProfileRefresh: () =>
    set((state) => ({ profileRefreshTrigger: state.profileRefreshTrigger + 1 })),
  addToProfile: async (refId: string | null, itemFields: StagedItemFields, backlog: boolean) => {
    // get user id

    let linkedRefId = refId
    if (linkedRefId === null) {
      const newRef = await get().createRef({
        title: itemFields.title || '',
        meta: itemFields.meta || '{}',
        image: itemFields.image,
      })
      linkedRefId = newRef.id
    }
    const newItem = await get().createItem(linkedRefId, itemFields, backlog)

    get().triggerFeedRefresh()

    return newItem
  },
  createRef: async (refFields: StagedRefFields) => {
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      throw new Error('User not found')
    }

    const createRefArgs = {
      creator: userId,
      title: refFields.title || '',
      url: refFields.url || '',
      meta: refFields.meta || '{}',
      image: refFields.image || '',
    }

    // create the ref in pocketbase
    const newRef = await pocketbase.collection<CompleteRef>('refs').create(createRefArgs)

    // create the ref in canvas
    await canvasApp.create('ref', {
      id: newRef.id,
      created: newRef.created || null,
      updated: newRef.updated || null,
      deleted: newRef.deleted || null,
      ...createRefArgs,
    })

    return newRef
  },
  createItem: async (refId: string, itemFields: StagedItemFields, backlog: boolean) => {
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      throw new Error('User not found')
    }
    const createItemArgs = {
      creator: userId,
      ref: refId,
      image: itemFields.image,
      url: itemFields.url,
      text: itemFields.text,
      list: itemFields.list || false,
      parent: itemFields.parent,
      backlog,
    }

    // create the item in pocketbase
    const newItem = await pocketbase.collection('items').create<ExpandedItem>(createItemArgs, {
      expand: 'ref',
    })

    // create the item in canvas
    await canvasApp.create('item', {
      id: `${userId}/${refId}`,
      created: newItem.created || null,
      updated: newItem.updated || null,
      deleted: newItem.deleted || null,
      ...createItemArgs,
    })

    return newItem
  },

  removeItem: async (id: string): Promise<void> => {
    const item = await pocketbase.collection('items').getOne(id)
    if (item.list) {
      const children = await pocketbase
        .collection('items')
        .getFullList({ filter: `parent = "${id}"` })
      for (const child of children) {
        await canvasApp.delete('item', child.id)
        await pocketbase.collection('items').delete(child.id)
      }
    }
    await canvasApp.delete('item', id)
    await pocketbase.collection('items').delete(id)

    get().triggerFeedRefresh()
  },
  addItemToList: async (listId: string, itemId: string) => {
    try {
      const userId = pocketbase.authStore.record?.id
      if (!userId) {
        throw new Error('User not found')
      }

      // update the item in pocketbase
      await pocketbase.collection('items').update(itemId, { parent: listId })

      // update the item in canvas
      await canvasApp.update('item', { id: `${userId}/${itemId}`, parent: listId })

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
      const userId = pocketbase.authStore.record?.id
      if (!userId) {
        throw new Error('User not found')
      }

      const editedState = get().editedState
      const updatedItem = await pocketbase
        .collection<ExpandedItem>('items')
        .update(id || get().editing, editedState, { expand: 'ref' })

      if (editedState.listTitle && updatedItem.list) {
        const ref = await pocketbase
          .collection('refs')
          .update(updatedItem.ref, { title: editedState.listTitle })
        if (updatedItem.expand?.ref) updatedItem.expand.ref = ref
      }

      // update the item in canvas
      await canvasApp.update('item', {
        id: `${userId}/${id}`,
        ...editedState,
        updated: updatedItem.updated,
      })

      if (editedState.listTitle && updatedItem.list) {
        await get().updateRefTitle(updatedItem.ref, editedState.listTitle)
      }

      // Trigger feed refresh since updates might affect feed visibility
      get().triggerFeedRefresh()

      return updatedItem
    } catch (e) {
      console.error(e)
      throw e
    }
  },
  moveToBacklog: async (id: string) => {
    try {
      const userId = pocketbase.authStore.record?.id
      if (!userId) {
        throw new Error('User not found')
      }

      const record = await pocketbase.collection<ItemsRecord>('items').update(id, { backlog: true })
      // update the item in canvas
      await canvasApp.update('item', { id: `${userId}/${id}`, backlog: true })

      // Trigger feed refresh since backlog items don't appear in the feed
      get().triggerFeedRefresh()

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  updateRefTitle: async (id: string, title: string) => {
    try {
      const record = await pocketbase.collection('refs').update(id, { title })
      await canvasApp.update('ref', { id, title })
      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
}))

export const getProfileItems = async (userName: string) => {
  const items = await pocketbase.collection<ExpandedItem>('items').getFullList({
    filter: pocketbase.filter(
      'creator.userName = {:userName} && backlog = false && parent = null',
      {
        userName,
      }
    ),
    expand: 'items_via_parent, ref, items_via_parent.ref, creator',
  })
  return gridSort(items)
}

export const getBacklogItems = async (userName: string) => {
  const items = await pocketbase.collection('items').getFullList({
    filter: pocketbase.filter('creator.userName = {:userName} && backlog = true && parent = null', {
      userName,
    }),
    expand: 'ref',
  })
  return items.sort(createdSort)
}
