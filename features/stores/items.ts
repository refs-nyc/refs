import { StateCreator } from 'zustand'
import { Item, Ref, Profile, StagedItemFields, StagedRefFields, ExpandedItem } from '../types'
import { createdSort } from '@/ui/profiles/sorts'
import type { StoreSlices } from './types'
import { canvasApp } from '../canvas/state'
import { PrimaryKeyValue } from '@canvas-js/modeldb'
import { formatDateString } from '../utils'

function gridSort(items: ExpandedItem[]): ExpandedItem[] {
  const itemsWithOrder: ExpandedItem[] = []
  const itemsWithoutOrder: ExpandedItem[] = []

  for (const item of items) {
    // if (item.order !== 0) {
    //   itemsWithOrder.push(item)
    // } else {
    itemsWithoutOrder.push(item)
    // }
  }
  // if items have an order value, sort them by order
  // itemsWithOrder.sort((a, b) => a.order - b.order)
  // otherwise sort them by created date
  itemsWithoutOrder.sort(createdSort)
  // return [...itemsWithOrder, ...itemsWithoutOrder]
  return itemsWithoutOrder
}

export type EditedState = {
  ref: string
  text: string
  image: string
  url: string
  listTitle: string
}

export type ItemSlice = {
  editing: string
  isAddingToList: boolean
  searchingNewRef: string
  editedState: Partial<EditedState>
  editingLink: boolean
  feedRefreshTrigger: number
  profileRefreshTrigger: number
  setEditingLink: (newValue: boolean) => void
  startEditing: (id: string) => void
  setIsAddingToList: (newValue: boolean) => void
  setSearchingNewRef: (id: string) => void
  stopEditing: () => void
  addToProfile: (
    refId: string | null,
    itemFields: StagedItemFields,
    backlog: boolean
  ) => Promise<ExpandedItem>
  createRef: (refFields: StagedRefFields) => Promise<Ref>
  createItem: (refId: string, itemFields: StagedItemFields, backlog: boolean) => Promise<Item>
  addItemToList: (listId: string, itemId: string) => Promise<void>
  update: (id?: string) => Promise<Item>
  updateEditedState: (e: Partial<EditedState>) => void
  removeItem: (id: string) => Promise<void>
  moveToBacklog: (id: string) => Promise<void>
  triggerFeedRefresh: () => void
  triggerProfileRefresh: () => void
  updateRefTitle: (id: string, title: string) => Promise<void>
  getFeedItems: () => Promise<ExpandedItem[]>
  getTickerItems: () => Promise<Ref[]>
  getRefById: (id: string) => Promise<Ref | null>
  getRefsByTitle: (title: string) => Promise<Ref[]>
  getItemById: (id: string) => Promise<ExpandedItem | null>
  getItemsByRefTitle: (title: string) => Promise<ExpandedItem[]>
  getItemsByRefIds: (refIds: string[]) => Promise<ExpandedItem[]>
  getAllItemsByCreator: (creator: Profile) => Promise<ExpandedItem[]>
  getListsByCreator: (creator: Profile) => Promise<ExpandedItem[]>
}

// ***
// Items
//
//
export const createItemSlice: StateCreator<StoreSlices, [], [], ItemSlice> = (set, get) => ({
  isAddingToList: false,
  editing: '',
  searchingNewRef: '', // the id to replace the ref for
  editedState: {},
  editingLink: false,
  feedRefreshTrigger: 0,
  profileRefreshTrigger: 0,
  setEditingLink: (newValue: boolean) => set(() => ({ editingLink: newValue })),
  startEditing: (id: string) => set(() => ({ editing: id })),
  setIsAddingToList: (newValue: boolean) => set(() => ({ isAddingToList: newValue })),
  setSearchingNewRef: (id: string) => set(() => ({ searchingNewRef: id })),
  stopEditing: () =>
    set(() => {
      return {
        editing: '',
        editedState: {
          text: '',
          image: '',
          url: '',
          listTitle: '',
          ref: '',
        },
        searchingNewRef: '',
        editingLink: false,
      }
    }),
  updateEditedState: (editedState: Partial<EditedState>) =>
    set(() => ({
      editedState: {
        ...get().editedState,
        ...editedState,
      },
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

    return await expandItem(newItem)
  },
  createRef: async (refFields: StagedRefFields) => {
    const { sessionSigner } = get()
    if (!sessionSigner) throw new Error('not logged in')

    const createRefArgs = {
      title: refFields.title || '',
      url: refFields.url || '',
      meta: refFields.meta || '{}',
      image: refFields.image || '',
      created: formatDateString(new Date()),
      updated: null,
      deleted: null,
    }

    const { result } = await canvasApp.as(sessionSigner).createRef(createRefArgs)

    return result
  },
  createItem: async (refId: string, itemFields: StagedItemFields, backlog: boolean) => {
    const { sessionSigner } = get()
    if (!sessionSigner) throw new Error('not logged in')

    const createItemArgs = {
      ref: refId,
      image: itemFields.image,
      url: itemFields.url,
      text: itemFields.text,
      list: itemFields.list || false,
      parent: itemFields.parent || null,
      promptContext: itemFields.promptContext || null,
      backlog,
      created: formatDateString(new Date()),
      updated: null,
      deleted: null,
    }

    const { result } = await canvasApp.as(sessionSigner).createItem(createItemArgs)

    return result
  },

  removeItem: async (id: string): Promise<void> => {
    const { sessionSigner } = get()
    if (!sessionSigner) throw new Error('not logged in')

    const item = await canvasApp.db.get('item', id)

    if (!item) throw new Error('Item not found')

    if (item.list) {
      const children = await canvasApp.db.query('item', { where: { parent: id } })
      for (const child of children) {
        await canvasApp.as(sessionSigner).removeItem(child.id)
      }
    }
    await canvasApp.as(sessionSigner).removeItem(id)

    get().triggerFeedRefresh()
  },
  addItemToList: async (listId: string, itemId: string) => {
    const { sessionSigner } = get()
    if (!sessionSigner) throw new Error('not logged in')

    await canvasApp.as(sessionSigner).addItemToList(listId, itemId)

    // newly created item might appear in feed before it is added to a list
    // so we should refresh after choosing a list
    // (because currently we are filtering out list children from feed)
    get().triggerFeedRefresh()
  },
  update: async (id?: string) => {
    const { sessionSigner } = get()
    if (!sessionSigner) throw new Error('not logged in')

    const editedState = get().editedState
    const { result: updatedItem } = await canvasApp
      .as(sessionSigner)
      .updateItem(id || get().editing, {
        image: editedState.image,
        url: editedState.url,
        text: editedState.text,
        listTitle: editedState.listTitle,
        updated: formatDateString(new Date()),
      })

    // Trigger feed refresh since updates might affect feed visibility
    get().triggerFeedRefresh()

    return updatedItem!
  },
  moveToBacklog: async (id: string) => {
    const { sessionSigner } = get()
    if (!sessionSigner) throw new Error('not logged in')

    await canvasApp.as(sessionSigner).moveItemToBacklog(id)

    // Trigger feed refresh since backlog items don't appear in the feed
    get().triggerFeedRefresh()
  },
  updateRefTitle: async (id: string, title: string) => {
    const { sessionSigner } = get()
    if (!sessionSigner) throw new Error('not logged in')

    await canvasApp.as(sessionSigner).updateRefTitle(id, title)
  },
  getFeedItems: async () => {
    const result = await canvasApp.db.query<Item>('item', {
      where: {
        creator: {
          neq: null,
        },
        backlog: false,
        list: false,
      },
      orderBy: {
        created: 'desc',
      },
    })
    return await expandItems(result)
  },
  getTickerItems: async () => {
    const refs = await canvasApp.db.query<Ref>('ref', {
      where: {
        showInTicker: true,
      },
      orderBy: {
        created: 'desc',
      },
    })
    return refs
  },
  getRefById: async (id: string) => {
    return await canvasApp.db.get('ref', id)
  },
  getRefsByTitle: async (title: string) => {
    const refs = await canvasApp.db.query<Ref>('ref', {
      where: {
        title,
      },
    })

    return refs
  },
  getItemById: async (id: string) => {
    const item = await canvasApp.db.get<Item>('item', id)
    if (!item) return null

    return await expandItem(item)
  },
  getItemsByRefTitle: async (title: string) => {
    const refs = await canvasApp.db.query<Ref>('ref', {
      where: {
        title,
      },
    })

    const refIds = refs.map((ref) => ref.id)

    const items = []
    for (const refId of refIds) {
      const matchingItems = await canvasApp.db.query<Item>('item', {
        where: {
          ref: refId,
        },
      })
      items.push(...matchingItems)
    }

    return await expandItems(items)
  },
  getItemsByRefIds: async (refIds: string[]) => {
    const items: Item[] = []
    for (const refId of refIds) {
      const items = await canvasApp.db.query<Item>('item', {
        where: {
          ref: refId,
        },
      })
      items.push(...items)
    }

    return await expandItems(items)
  },
  getAllItemsByCreator: async (creator: Profile) => {
    const items = await canvasApp.db.query<Item>('item', {
      where: {
        creator: creator.did,
      },
    })
    return await expandItems(items)
  },
  getListsByCreator: async (creator: Profile) => {
    const items = await canvasApp.db.query<Item>('item', {
      where: {
        list: true,
        creator: creator.did,
      },
    })
    return await expandItems(items)
  },
})

async function expandItem(item: Item): Promise<ExpandedItem> {
  const ref = await canvasApp.db.get<Ref>('ref', item.ref as PrimaryKeyValue)
  if (!ref) throw new Error('Ref not found')
  const creator = await canvasApp.db.get<Profile>('profile', item.creator as PrimaryKeyValue)
  if (!creator) throw new Error('Creator not found')

  const itemsViaParent = await canvasApp.db.query<Item>('item', {
    where: {
      parent: item.id,
    },
  })

  return { ...item, expand: { ref, creator, items_via_parent: itemsViaParent } }
}

async function expandItems(items: Item[]): Promise<ExpandedItem[]> {
  const expandedItems = await Promise.all(items.map(expandItem))
  return expandedItems
}

export const getProfileItems = async (user: Profile) => {
  const items = await canvasApp.db.query<Item>('item', {
    where: {
      creator: user.did,
      backlog: false,
      parent: null,
    },
  })
  return gridSort(await expandItems(items))
}

export const getBacklogItems = async (user: Profile) => {
  const items = await canvasApp.db.query<Item>('item', {
    where: {
      creator: user.did,
      backlog: true,
      parent: null,
    },
  })
  const expandedItems = await expandItems(items)
  return expandedItems.sort(createdSort)
}
