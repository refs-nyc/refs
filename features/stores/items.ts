import { StateCreator } from 'zustand'
import { ExpandedItem, CompleteRef, StagedItemFields, StagedRefFields } from '../types'
import { ItemsRecord, RefsRecord } from '../pocketbase/pocketbase-types'
import { createdSort } from '@/ui/profiles/sorts'
import type { StoreSlices } from './types'
import { pocketbase } from '../pocketbase'
import { edgeFunctionClient } from '../supabase/edge-function-client'
import { simpleCache } from '@/features/cache/simpleCache'

const USE_WEBHOOKS = (process.env.EXPO_PUBLIC_USE_WEBHOOKS || '').toLowerCase() === 'true'

// Helper function to update show_in_directory flag when item count or avatar changes
export async function updateShowInDirectory(userId: string) {
  try {
    // Get user's current info
    const user = await pocketbase.collection('users').getOne(userId)
    const hasAvatar = Boolean((user.image || '').trim() || (user.avatar_url || '').trim())
    
    // Count items created by user (non-backlog, non-list grid items)
    const createdItems = await pocketbase.collection('items').getList(1, 1, {
      filter: `creator = "${userId}" && backlog = false && list = false && parent = null`,
    })
    
    // Count saved items on user's profile
    const savedItems = await pocketbase.collection('saves').getList(1, 1, {
      filter: `user = "${userId}"`,
    })
    
    const totalProfileItems = createdItems.totalItems + savedItems.totalItems
    const hasEnoughItems = totalProfileItems >= 3
    
    // Update flag if criteria is met
    const shouldShow = hasAvatar && hasEnoughItems
    
    console.log(`🏷️ Updating show_in_directory for ${userId}: hasAvatar=${hasAvatar}, created=${createdItems.totalItems}, saved=${savedItems.totalItems}, total=${totalProfileItems}, shouldShow=${shouldShow}`)
    
    if (user.show_in_directory !== shouldShow) {
      await pocketbase.collection('users').update(userId, {
        show_in_directory: shouldShow,
      })
      console.log(`✅ Updated show_in_directory to ${shouldShow} for user ${userId}`)
      
      // Clear directory cache so the change is reflected immediately
      simpleCache.set('directory_users', null).catch(error => {
        console.warn('Directory cache clear failed:', error)
      })
    }
  } catch (error) {
    console.warn('Failed to update show_in_directory:', error)
  }
}

// Helper function to trigger webhook for item changes (gated by env flag)
async function triggerItemWebhook(itemId: string, action: 'create' | 'update', itemData: any) {
  try {
    if (!USE_WEBHOOKS) {
      // Webhooks explicitly disabled – skip safely
      return
    }
    // Access environment variable inside function to prevent module-level crashes
    const webhookUrl = process.env.EXPO_PUBLIC_WEBHOOK_URL || 'http://localhost:3002'

    await fetch(`${webhookUrl}/webhook/item-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemId,
        action,
        itemData,
      }),
    })

    console.log(`✅ Webhook triggered for item ${itemId} (${action})`)
  } catch (error) {
    console.error(`❌ Failed to trigger webhook for item ${itemId}:`, error)
    // Don't throw - webhook failure shouldn't break the main flow
  }
}

async function processItemViaEdgeFunction(newItem: ExpandedItem) {
  // Fallback: Call Supabase Edge Function directly
  await edgeFunctionClient.processItem({
    item_id: newItem.id,
    ref_id: newItem.ref,
    creator: newItem.creator,
    item_text: newItem.text || '',
    ref_title: newItem.expand?.ref?.title || 'Unknown',
  })

  // Regenerate spirit vector for the user
  await edgeFunctionClient.regenerateSpiritVector({
    user_id: newItem.creator,
  })
}

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
  isAddingToList: boolean
  searchingNewRef: string
  editedState: {
    text?: string
    image?: string
    url?: string
    listTitle?: string
    refTitle?: string
  }
  editingLink: boolean
  feedRefreshTrigger: number
  profileRefreshTrigger: number
  // Track client-side background processing state for newly created items
  uploadingItems: Set<string>
  addUploadingItem: (itemId: string) => void
  removeUploadingItem: (itemId: string) => void
  // Cache grid count to avoid database queries
  gridItemCount: number
  setGridItemCount: (count: number) => void
  incrementGridItemCount: () => void
  decrementGridItemCount: () => void
  // Optimistic item management
  optimisticItems: Map<string, ExpandedItem>
  addOptimisticItem: (item: ExpandedItem) => void
  replaceOptimisticItem: (tempId: string, realItem: ExpandedItem) => void
  removeOptimisticItem: (tempId: string) => void
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
  createRef: (refFields: StagedRefFields) => Promise<CompleteRef>
  createItem: (
    refId: string,
    itemFields: StagedItemFields,
    backlog: boolean
  ) => Promise<ExpandedItem>
  addItemToList: (listId: string, itemId: string) => Promise<void>
  update: (id?: string) => Promise<ExpandedItem>
  updateEditedState: (e: Partial<ExpandedItem & { listTitle: string; refTitle: string }>) => void
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
  getItemByIdWithFullExpansion: (id: string) => Promise<ExpandedItem>
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
  isAddingToList: false,
  editing: '',
  searchingNewRef: '', // the id to replace the ref for
  editedState: {},
  editingLink: false,
  feedRefreshTrigger: 0,
  profileRefreshTrigger: 0,
  uploadingItems: new Set<string>(),
  gridItemCount: 0, // Initialize to 0, will be set when profile loads
  optimisticItems: new Map<string, ExpandedItem>(),
  addUploadingItem: (itemId: string) =>
    set((state) => ({ uploadingItems: new Set([...state.uploadingItems, itemId]) })),
  removeUploadingItem: (itemId: string) =>
    set((state) => {
      const next = new Set(state.uploadingItems)
      next.delete(itemId)
      return { uploadingItems: next }
    }),
  setGridItemCount: (count: number) => set(() => ({ gridItemCount: count })),
  incrementGridItemCount: () => set((state) => ({ gridItemCount: state.gridItemCount + 1 })),
  decrementGridItemCount: () => set((state) => ({ gridItemCount: Math.max(0, state.gridItemCount - 1) })),
  addOptimisticItem: (item: ExpandedItem) =>
    set((state) => {
      console.log('➕ ADDING OPTIMISTIC ITEM:', item.id)
      // Only update if the item doesn't already exist or is different
      const existingItem = state.optimisticItems.get(item.id)
      if (existingItem && JSON.stringify(existingItem) === JSON.stringify(item)) {
        console.log('➕ OPTIMISTIC ITEM ALREADY EXISTS, NO CHANGE')
        return state // No change needed
      }
      const next = new Map(state.optimisticItems)
      next.set(item.id, item)
      console.log('➕ OPTIMISTIC ITEM ADDED, NEW MAP SIZE:', next.size)
      return { optimisticItems: next }
    }),
  replaceOptimisticItem: (tempId: string, realItem: ExpandedItem) =>
    set((state) => {
      console.log('🔄 REPLACING OPTIMISTIC ITEM:', tempId, '->', realItem.id)
      const next = new Map(state.optimisticItems)
      
      // Preserve the image from the optimistic item if the real item doesn't have one
      const optimisticItem = next.get(tempId)
      const itemWithPreservedImage = optimisticItem && !realItem.image && optimisticItem.image
        ? { ...realItem, image: optimisticItem.image }
        : realItem
      
      // Only update if the item is different
      const existingItem = next.get(realItem.id)
      if (existingItem && JSON.stringify(existingItem) === JSON.stringify(itemWithPreservedImage)) {
        console.log('🔄 OPTIMISTIC ITEM REPLACEMENT - NO CHANGE NEEDED')
        return state // No change needed
      }
      
      next.delete(tempId)
      next.set(realItem.id, itemWithPreservedImage)
      console.log('🔄 OPTIMISTIC ITEM REPLACED, NEW MAP SIZE:', next.size)
      return { optimisticItems: next }
    }),
  removeOptimisticItem: (tempId: string) =>
    set((state) => {
      // Only update if the item exists
      if (!state.optimisticItems.has(tempId)) {
        return state // No change needed
      }
      
      const next = new Map(state.optimisticItems)
      next.delete(tempId)
      return { optimisticItems: next }
    }),
  setEditingLink: (newValue: boolean) => set(() => ({ editingLink: newValue })),
  startEditing: (id: string) => set(() => ({ editing: id })),
  setIsAddingToList: (newValue: boolean) => set(() => ({ isAddingToList: newValue })),
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
    refTitle?: string
  }) =>
    set(() => ({
      ...get().editedState,
      editedState,
    })),
  triggerFeedRefresh: () => {
    set((state) => ({ feedRefreshTrigger: state.feedRefreshTrigger + 1 }))
    const refreshFeed = get().refreshFeed
    if (typeof refreshFeed === 'function') {
      refreshFeed({ force: true, silent: true }).catch((error: unknown) => {
        console.warn('Feed refresh failed after item change', error)
      })
    }
  },
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

    // Update cached grid count if adding to grid (not backlog)
    if (!backlog) {
      get().incrementGridItemCount()
      
      // Update show_in_directory flag if adding to grid (async, non-blocking)
      const userId = pocketbase.authStore.record?.id
      if (userId) {
        updateShowInDirectory(userId).catch(error => {
          console.warn('Failed to update show_in_directory:', error)
        })
      }
    }

    get().triggerFeedRefresh()

    // Clear cache for this user (silent operation)
    const userId = pocketbase.authStore.record?.id
    if (userId) {
      simpleCache.clearUser(userId).catch(error => {
        console.warn('Cache clear failed:', error)
      })
    }

    return newItem
  },
  createRef: async (refFields: StagedRefFields) => {
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      throw new Error('User not found')
    }

    const normalizeTitle = (t?: string) => (t || '').replace(/\s+/g, ' ').trim()
    const createRefArgs = {
      creator: userId,
      title: normalizeTitle(refFields.title),
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

    // Kick off background processing (non-blocking) without showing processing indicator
    ;(async () => {
      try {
        if (USE_WEBHOOKS) {
          await triggerItemWebhook(newItem.id, 'create', {
            ref: newItem.ref,
            creator: newItem.creator,
            text: newItem.text,
            ref_title: newItem.expand?.ref?.title || 'Unknown',
          })
        } else {
          await processItemViaEdgeFunction(newItem)
        }
      } catch (error) {
        console.error('Item processing failed (background):', error)
      }
    })()

    return newItem
  },

  removeItem: async (id: string): Promise<void> => {
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      throw new Error('User not found')
    }

    // Check if this is an optimistic item (temp ID)
    if (id.startsWith('temp-')) {
      // Optimistic item - just remove it from optimistic items
      get().removeOptimisticItem(id)
      return
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

    // Update cached grid count if item was in grid (not backlog)
    if (!item.backlog) {
      get().decrementGridItemCount()
      
      // Update show_in_directory flag after removing from grid (async, non-blocking)
      updateShowInDirectory(userId).catch(error => {
        console.warn('Failed to update show_in_directory:', error)
      })
    }

    get().triggerFeedRefresh()

    // Clear cache for this user (silent operation)
    simpleCache.clearUser(userId).catch(error => {
      console.warn('Cache clear failed:', error)
    })
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

      // Support editing ref title for non-list items as well
      if (editedState.refTitle) {
        const ref = await pocketbase
          .collection('refs')
          .update(updatedItem.ref, { title: editedState.refTitle })
        if (updatedItem.expand?.ref) updatedItem.expand.ref = ref

        await get().updateRefTitle(updatedItem.ref, editedState.refTitle)
      }

      // Kick off background processing (non-blocking) for edge functions
      ;(async () => {
        try {
          if (USE_WEBHOOKS) {
            await triggerItemWebhook(updatedItem.id, 'update', {
              ref: updatedItem.ref,
              creator: updatedItem.creator,
              text: updatedItem.text,
              ref_title: updatedItem.expand?.ref?.title || 'Unknown',
            })
          } else {
            await processItemViaEdgeFunction(updatedItem)
          }
        } catch (error) {
          console.error('Background update processing failed:', error)
          // Don't throw - background processing failure shouldn't break the main flow
        }
      })()

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

      // Check if this is an optimistic item (temp ID)
      if (id.startsWith('temp-')) {
        // Optimistic item - just remove it from optimistic items
        get().removeOptimisticItem(id)
        return null as any
      }

      const record = await pocketbase.collection<ItemsRecord>('items').update(id, { backlog: true })

      // Update cached grid count since item is moving from grid to backlog
      get().decrementGridItemCount()
      
      // Update show_in_directory flag after moving to backlog (async, non-blocking)
      updateShowInDirectory(userId).catch(error => {
        console.warn('Failed to update show_in_directory:', error)
      })

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
      const normalizeTitle = (t?: string) => (t || '').replace(/\s+/g, ' ').trim()
      const record = await pocketbase.collection('refs').update(id, { title: normalizeTitle(title) })
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
      filter: `creator != "" && backlog = false && list = false && parent = null`,
      sort: '-created',
      expand: 'ref,creator',
    })
    return result.items
  },
  getTickerItems: async () => {
    // Only show specific refs in ticker: Musee d'Orsay, Edge City, Bringing Up Baby, Tennis
    const allowedTickerTitles = ["Musee d'Orsay", 'Edge city ', 'Bringing Up Baby', 'Tennis']

    const results = await pocketbase.collection('refs').getFullList<RefsRecord>({
      filter: allowedTickerTitles.map((title) => `title = "${title}"`).join(' || '),
      sort: '-created',
      perPage: 10,
    })

    // Deduplicate by title to prevent multiple entries with the same title
    const uniqueResults = results.filter(
      (ref, index, self) => index === self.findIndex((r) => r.title === ref.title)
    )

    return uniqueResults
  },
  getRefById: async (id: string) => {
    return await pocketbase.collection<CompleteRef>('refs').getOne(id)
  },
  getRefsByTitle: async (title: string) => {
    const normalizeTitle = (t?: string) => (t || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const raw = await pocketbase
      .collection<CompleteRef>('refs')
      .getFullList({ filter: `title ~ "${(title || '').trim()}"`, sort: '-updated,-created' })
    const seen: Record<string, CompleteRef> = {}
    for (const r of raw) {
      const key = normalizeTitle((r as any).title)
      if (!seen[key]) seen[key] = r
    }
    return Object.values(seen)
  },
  getItemById: async (id: string) => {
    return await pocketbase.collection('items').getOne<ExpandedItem>(id, {
      expand: 'ref,items_via_parent,items_via_parent.ref',
    })
  },
  getItemByIdWithFullExpansion: async (id: string) => {
    return await pocketbase.collection('items').getOne<ExpandedItem>(id, {
      expand: 'ref,creator,items_via_parent,items_via_parent.ref',
    })
  },
  getItemsByRefTitle: async (title: string) => {
    return await pocketbase
      .collection<ExpandedItem>('items')
      .getFullList({ filter: `ref.title ~ "${title}"`, expand: 'ref' })
  },
  getItemsByRefIds: async (refIds: string[]) => {
    const filter = refIds.map((id) => `ref="${id}"`).join(' || ')

    const results = await pocketbase.collection('items').getFullList<ExpandedItem>({
      filter,
      expand: 'creator, ref',
    })

    return results
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
      .getFullList({ filter: `list = true && creator = "${creatorId}"`, expand: 'ref,items_via_parent,items_via_parent.ref' })
  },
})

export type ProfileItemsRequest = {
  userName: string
  userId?: string
  forceNetwork?: boolean
}

const resolveProfileUserId = (userId: string | undefined, userName: string): string | undefined => {
  if (userId) return userId
  const authRecord = pocketbase.authStore.record
  if (authRecord?.userName === userName) {
    return authRecord.id
  }
  return undefined
}

export const getProfileItems = async ({ userName, userId, forceNetwork = false }: ProfileItemsRequest) => {
  const effectiveUserId = resolveProfileUserId(userId, userName)

  if (!forceNetwork && effectiveUserId) {
    const cached = await simpleCache.get<ExpandedItem[]>('grid_items', effectiveUserId)
    if (Array.isArray(cached) && cached.length > 0) {
      return cached.map(compactGridItem)
    }
  }

  const items = await pocketbase.collection<ExpandedItem>('items').getList(1, 12, {
    filter: effectiveUserId
      ? pocketbase.filter('creator = {:userId} && backlog = false && parent = null', {
          userId: effectiveUserId,
        })
      : pocketbase.filter('creator.userName = {:userName} && backlog = false && parent = null', {
          userName,
        }),
    expand: 'ref',
    sort: '-created',
  })
  const sorted = gridSort(items.items)
  const compacted = sorted.map(compactGridItem)
  if (effectiveUserId) {
    void simpleCache.set('grid_items', compacted, effectiveUserId)
  }
  return compacted
}

export const getBacklogItems = async ({ userName, userId, forceNetwork = false }: ProfileItemsRequest) => {
  const effectiveUserId = resolveProfileUserId(userId, userName)

  if (!forceNetwork && effectiveUserId) {
    const cached = await simpleCache.get<ExpandedItem[]>('backlog_items', effectiveUserId)
    if (Array.isArray(cached)) {
      return cached.map(compactGridItem)
    }
  }

  const items = await pocketbase.collection('items').getList(1, 20, {
    filter: effectiveUserId
      ? pocketbase.filter('creator = {:userId} && backlog = true && parent = null', {
          userId: effectiveUserId,
        })
      : pocketbase.filter('creator.userName = {:userName} && backlog = true && parent = null', {
          userName,
        }),
    expand: 'ref',
    sort: '-created',
  })
  const sorted = items.items.sort(createdSort)
  const compacted = sorted.map(compactGridItem)
  if (effectiveUserId) {
    void simpleCache.set('backlog_items', compacted, effectiveUserId)
  }
  return compacted
}

const compactGridItem = (item: ExpandedItem): ExpandedItem => {
  const ref = item.expand?.ref
  if (!ref) {
    return item
  }

  const compactRef = {
    ...ref,
    subtitle: (ref as any)?.subtitle ?? undefined,
    link: (ref as any)?.link ?? undefined,
    caption: (ref as any)?.caption ?? undefined,
  }

  return {
    ...item,
    expand: {
      ...item.expand,
      ref: compactRef,
    } as ExpandedItem['expand'],
  }
}

// Function to automatically move items from backlog to grid when there's space
export const autoMoveBacklogToGrid = async (
  userName: string,
  existingGridItems?: ExpandedItem[],
  existingBacklogItems?: ExpandedItem[]
) => {
  try {
    const gridItems =
      existingGridItems ??
      (await getProfileItems({
        userName,
      }))
    const backlogItems =
      existingBacklogItems ??
      (await getBacklogItems({
        userName,
      }))
    
    // If grid is full, no need to move anything
    if (gridItems.length >= 12) {
      return
    }
    
    // Calculate how many items we can move
    const availableSlots = 12 - gridItems.length
    const itemsToMove = backlogItems.slice(0, availableSlots)
    
    // Move items from backlog to grid
    for (const item of itemsToMove) {
      await pocketbase.collection('items').update(item.id, { backlog: false })
    }
    
    console.log(`Moved ${itemsToMove.length} items from backlog to grid`)
  } catch (error) {
    console.error('Error auto-moving backlog items to grid:', error)
  }
}
