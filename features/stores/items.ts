import { pocketbase } from '../pocketbase'
import { StateCreator } from 'zustand'
import { ExpandedItem, CompleteRef, StagedItemFields, StagedRefFields } from '../types'
import { ItemsRecord, RefsRecord } from '../pocketbase/pocketbase-types'
import { createdSort } from '@/ui/profiles/sorts'
import type { StoreSlices } from './types'

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

export type ItemSlice = {
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
  getFeedItems: () => Promise<ExpandedItem[]>
  getTickerItems: () => Promise<RefsRecord[]>
  getRefById: (id: string) => Promise<CompleteRef>
  getRefsByTitle: (title: string) => Promise<CompleteRef[]>
  getItemById: (id: string) => Promise<ExpandedItem>
  getItemsByRefTitle: (title: string) => Promise<ExpandedItem[]>
  getItemsByRefIds: (refIds: string[]) => Promise<ExpandedItem[]>
  getAllItemsByCreator: (creatorId: string) => Promise<ExpandedItem[]>
  getListsByCreator: (creatorId: string) => Promise<ExpandedItem[]>
}

// ***
// Items
//
//
export const createItemSlice: StateCreator<StoreSlices, [], [], ItemSlice> = (set, get) => ({
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
      parent: itemFields.parent || null,
      backlog,
    }

    // create the item in pocketbase
    const newItem = await pocketbase.collection('items').create<ExpandedItem>(createItemArgs, {
      expand: 'ref',
    })

    return newItem
  },

  removeItem: async (id: string): Promise<void> => {
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      throw new Error('User not found')
    }

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

      // Trigger feed refresh since backlog items don't appear in the feed
      get().triggerFeedRefresh()

      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  updateRefTitle: async (id: string, title: string) => {
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      throw new Error('User not found')
    }
    try {
      const record = await pocketbase.collection('refs').update(id, { title })
      return record
    } catch (error) {
      console.error(error)
      throw error
    }
  },
  getFeedItems: async () => {
    const result = await pocketbase.collection('items').getList<ExpandedItem>(1, 30, {
      // TODO: remove list = false once we have a way to display lists in the feed
      // also consider showing backlog items in the feed, when we have a way to link to them
      filter: `creator != null && backlog = false && list = false && parent = null`,
      sort: '-created',
      expand: 'ref,creator',
    })
    return result.items
  },
  getTickerItems: async () => {
    return await pocketbase.collection('refs').getFullList<RefsRecord>({
      filter: 'showInTicker=true',
      sort: '-created',
    })
  },
  getRefById: async (id: string) => {
    return await pocketbase.collection<CompleteRef>('refs').getOne(id)
  },
  getRefsByTitle: async (title: string) => {
    return await pocketbase
      .collection<CompleteRef>('refs')
      .getFullList({ filter: `title ~ "${title}"` })
  },
  getItemById: async (id: string) => {
    return await pocketbase.collection('items').getOne<ExpandedItem>(id, {
      expand: 'ref,items_via_parent,items_via_parent.ref',
    })
  },
  getItemsByRefTitle: async (title: string) => {
    return await pocketbase
      .collection<ExpandedItem>('items')
      .getFullList({ filter: `ref.title ~ "${title}"`, expand: 'ref' })
  },
  getItemsByRefIds: async (refIds: string[]) => {
    const filter = refIds.map((id) => `ref="${id}"`).join(' || ')

    return await pocketbase.collection('items').getFullList({
      filter,
      expand: 'creator, ref',
    })
  },
  getAllItemsByCreator: async (creatorId: string) => {
    return await pocketbase.collection('items').getFullList<ExpandedItem>({
      filter: `creator = "${creatorId}"`,
      expand: 'ref',
    })
  },
  getListsByCreator: async (creatorId: string) => {
    return await pocketbase
      .collection<ExpandedItem>('items')
      .getFullList({ filter: `list = true && creator = "${creatorId}"`, expand: 'ref' })
  },
})

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
