import { pocketbase } from '../pocketbase'
import { RecordModel } from 'pocketbase'
import { create } from 'zustand'
import { ExpandedItem, CompleteRef, StagedRef, StagedItemFields, StagedRefFields } from './types'
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
  update: (id?: string) => Promise<RecordModel>
  updateEditedState: (e: Partial<ExpandedItem & { listTitle: string }>) => void
  removeItem: (id: string) => Promise<void>
  moveToBacklog: (id: string) => Promise<ItemsRecord>
  triggerFeedRefresh: () => void
  triggerProfileRefresh: () => void

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
    // create the ref in pocketbase
    const newRef = await pocketbase.collection<CompleteRef>('refs').create({
      creator: userId,
      title: refFields.title || '',
      meta: refFields.meta || '{}',
      image: refFields.image,
    })

    // create the ref in canvas
    await canvasApp.actions.createRef(newRef.id, refFields)

    return newRef
  },
  createItem: async (refId: string, itemFields: StagedItemFields, backlog: boolean) => {
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      throw new Error('User not found')
    }

    const newItem = await pocketbase.collection('items').create<ExpandedItem>(
      {
        creator: userId,
        ref: refId,
        image: itemFields.image,
        url: itemFields.url,
        text: itemFields.text,
        list: itemFields.list || false,
        parent: itemFields.parent,
        backlog,
      },
      { expand: 'ref' }
    )

    await canvasApp.actions.createItem(refId, itemFields.image, itemFields.text)
    return newItem
  },

  removeItem: async (id: string): Promise<void> => {
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

    get().triggerFeedRefresh()
  },
  addItemToList: async (listId: string, itemId: string) => {
    try {
      await pocketbase.collection('items').update(itemId, { parent: listId })
      await canvasApp.actions.addItemToList(listId, itemId)
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
      const editedState = get().editedState
      const record = await pocketbase
        .collection('items')
        .update(id || get().editing, editedState, { expand: 'children,ref' })

      if (editedState.listTitle && record.list) {
        const ref = await pocketbase
          .collection('refs')
          .update(record.ref, { title: editedState.listTitle })
        if (record.expand?.ref) record.expand.ref = ref
      }
      await canvasApp.actions.updateItem(id, editedState)

      if (editedState.listTitle && record.list) {
        await canvasApp.actions.updateRef(record.ref, { title: editedState.listTitle })
      }

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
      await canvasApp.actions.moveItemToBacklog(id)

      // Trigger feed refresh since backlog items don't appear in the feed
      get().triggerFeedRefresh()

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  updateOneRef: async (id: string, fields: Partial<StagedRef>) => {
    try {
      const record = await pocketbase.collection('refs').update(id, { ...fields })
      await canvasApp.actions.updateRef(id, fields)
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
    expand: 'children, ref',
  })
  return items.sort(createdSort)
}
