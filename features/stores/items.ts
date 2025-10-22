import { InteractionManager } from 'react-native'
import { StateCreator } from 'zustand'
import { nanoid } from 'nanoid'
import { queryClient } from '@/core/queryClient'
import {
  ExpandedItem,
  CompleteRef,
  StagedItemFields,
  StagedRefFields,
} from '../types'
import { ItemsRecord, RefsRecord, Collections } from '../pocketbase/pocketbase-types'
import { createdSort } from '@/ui/profiles/sorts'
import type { StoreSlices } from './types'
import { pocketbase } from '../pocketbase'
import { edgeFunctionClient } from '../supabase/edge-function-client'
import { simpleCache } from '@/features/cache/simpleCache'
import { gridSort, compactGridItem } from './itemFormatters'
import {
  getProfileCacheEntryByUserId,
  writeProfileSnapshot,
  type ProfileSnapshotPayload,
} from '@/features/cache/profileCache'
import { profileKeys, type ProfileData } from '@/features/queries/profile'
import {
  beginProfileMutation,
  endProfileMutation,
  recordDeletedTombstone,
} from '@/features/cache/profileMutationState'
import { isInteractionGateActive } from '@/features/perf/interactionGate'

const forceNetworkProfileIds = new Set<string>()

const buildProfileQueryKey = (userId?: string) =>
  userId ? profileKeys.grid(userId) : (['profile', 'unknown', 'grid'] as const)

const LOCAL_IMAGE_PREFIXES = ['file://', 'content://', 'ph://', 'assets-library://', 'data:image', 'blob:']

const isLikelyLocalImageUri = (value?: string | null): value is string => {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return (
    LOCAL_IMAGE_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) ||
    trimmed.startsWith('/') ||
    /^[A-Za-z0-9_-]+$/.test(trimmed)
  )
}

type PendingImageMeta = {
  type: 'temp' | 'real'
  backlog: boolean
}

type PendingImageUploadEntry = {
  localUri: string
  creatorId?: string
  userName?: string
  remoteUrl?: string
  items: Map<string, PendingImageMeta>
}

const clonePendingEntry = (entry: PendingImageUploadEntry): PendingImageUploadEntry => ({
  localUri: entry.localUri,
  creatorId: entry.creatorId,
  userName: entry.userName,
  remoteUrl: entry.remoteUrl,
  items: new Map(entry.items),
})

const cloneProfileData = (data: ProfileData): ProfileData => ({
  profile: { ...data.profile },
  gridItems: [...data.gridItems],
  backlogItems: [...data.backlogItems],
})

const readProfileSnapshot = (userId: string, userName?: string): ProfileData | null => {
  const entry = getProfileCacheEntryByUserId(userId)
  if (entry) {
    return cloneProfileData(entry)
  }
  const queryData = queryClient.getQueryData<ProfileData>(buildProfileQueryKey(userId))
  if (queryData) {
    return cloneProfileData(queryData)
  }
  return null
}

const ensureProfileSnapshot = (userId: string, userName?: string): ProfileData => {
  const snapshot = readProfileSnapshot(userId, userName)
  if (snapshot) {
    return snapshot
  }

  const authRecord = pocketbase.authStore.record
  if (authRecord && authRecord.id === userId) {
    const nowIso = new Date().toISOString()
    return {
      profile: {
        ...(authRecord as any),
        updated: authRecord.updated ?? nowIso,
      },
      gridItems: [],
      backlogItems: [],
    } as ProfileData
  }

  throw new Error('Profile snapshot unavailable')
}

const buildOptimisticItem = ({
  tempId,
  refId,
  creatorId,
  itemFields,
  backlog,
}: {
  tempId: string
  refId?: string | null
  creatorId: string
  itemFields: StagedItemFields
  backlog: boolean
}): ExpandedItem => {
  const nowIso = new Date().toISOString()
  const resolvedRefId = refId || `temp_ref_${nanoid(8)}`
  const title = (itemFields.title || '').trim()
  const normalizedList = Boolean(itemFields.list)
  return {
    id: tempId,
    collectionId: Collections.Items,
    collectionName: Collections.Items,
    ref: resolvedRefId,
    image: itemFields.image || '',
    url: itemFields.url || '',
    text: itemFields.text || '',
    list: normalizedList,
    backlog,
    order: itemFields.order ?? 0,
    promptContext: itemFields.promptContext || '',
    parent: itemFields.parent ?? '',
    created: nowIso,
    updated: nowIso,
    creator: creatorId,
    expand: {
      ref: {
        id: resolvedRefId,
        title,
        image: itemFields.image || '',
        url: itemFields.url || '',
        meta: itemFields.meta || '{}',
        creator: creatorId,
        created: nowIso,
        updated: nowIso,
      },
      creator: {
        id: creatorId,
        email: '',
        emailVisibility: false,
        userName: '',
        verified: false,
        created: nowIso,
        updated: nowIso,
      },
      items_via_parent: [],
    },
  }
}

const applyOptimisticAdd = (
  snapshot: ProfileData,
  optimisticItem: ExpandedItem,
  backlog: boolean
): ProfileData => {
  const nextGrid = backlog
    ? snapshot.gridItems
    : gridSort([...snapshot.gridItems.filter((item) => item.id !== optimisticItem.id), optimisticItem])
  const nextBacklog = backlog
    ? [...snapshot.backlogItems.filter((item) => item.id !== optimisticItem.id), optimisticItem].sort(createdSort)
    : snapshot.backlogItems

  return {
    profile: snapshot.profile,
    gridItems: nextGrid,
    backlogItems: nextBacklog,
  }
}

const applyOptimisticRemoval = (
  snapshot: ProfileData,
  itemId: string,
  options: { backlog: boolean }
): ProfileData => {
  const nextGrid = options.backlog ? snapshot.gridItems : snapshot.gridItems.filter((item) => item.id !== itemId)
  const nextBacklog = options.backlog
    ? snapshot.backlogItems.filter((item) => item.id !== itemId)
    : snapshot.backlogItems

  return {
    profile: snapshot.profile,
    gridItems: nextGrid,
    backlogItems: nextBacklog,
  }
}

const applyOptimisticMoveToBacklog = (snapshot: ProfileData, item: ExpandedItem): ProfileData => {
  const nextGrid = snapshot.gridItems.filter((candidate) => candidate.id !== item.id)
  const backlogItem = { ...item, backlog: true }
  const nextBacklog = [...snapshot.backlogItems.filter((candidate) => candidate.id !== item.id), backlogItem].sort(
    createdSort
  )

  return {
    profile: snapshot.profile,
    gridItems: nextGrid,
    backlogItems: nextBacklog,
  }
}

export const markProfileGridDirty = (userId: string) => {
  forceNetworkProfileIds.add(userId)
}

const consumeProfileGridDirty = (userId?: string): boolean => {
  if (!userId) return false
  if (forceNetworkProfileIds.has(userId)) {
    forceNetworkProfileIds.delete(userId)
    return true
  }
  return false
}

const USE_WEBHOOKS = (process.env.EXPO_PUBLIC_USE_WEBHOOKS || '').toLowerCase() === 'true'

type InteractionHandle = { cancel?: () => void } | null
let pendingFeedRefresh: InteractionHandle = null
let pendingProfileRefresh: InteractionHandle = null

const scheduleAfterInteractions = (fn: () => void): InteractionHandle => {
  try {
    return InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        fn()
      })
    }) as InteractionHandle
  } catch {
    const timeout = setTimeout(fn, 0)
    return {
      cancel: () => clearTimeout(timeout),
    }
  }
}

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
  pendingImageUploads: Map<string, PendingImageUploadEntry>
  notePendingImageForItem: (
    localUri: string,
    options: {
      itemId: string
      backlog: boolean
      type: PendingImageMeta['type']
      creatorId: string
      userName?: string
    }
  ) => void
  transitionPendingImageToReal: (localUri: string, tempId: string, realId: string) => void
  finalizePendingImageUpload: (localUri: string, remoteUrl: string) => Promise<void>
  failPendingImageUpload: (localUri: string) => void
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
  pendingImageUploads: new Map<string, PendingImageUploadEntry>(),
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
  notePendingImageForItem: (localUri, { itemId, backlog, type, creatorId, userName }) => {
    let remoteUrlToFinalize: string | undefined
    set((state) => {
      const pending = new Map(state.pendingImageUploads)
      const existing = pending.get(localUri)
      const entry = existing
        ? clonePendingEntry(existing)
        : {
            localUri,
            creatorId,
            userName,
            remoteUrl: undefined,
            items: new Map<string, PendingImageMeta>(),
          }
      if (!entry.creatorId) entry.creatorId = creatorId
      if (!entry.userName && userName) entry.userName = userName
      entry.items.set(itemId, { backlog, type })
      pending.set(localUri, entry)
      remoteUrlToFinalize = entry.remoteUrl
      return { pendingImageUploads: pending }
    })
    if (remoteUrlToFinalize) {
      void get().finalizePendingImageUpload(localUri, remoteUrlToFinalize)
    }
  },
  transitionPendingImageToReal: (localUri, tempId, realId) => {
    let remoteUrlToFinalize: string | undefined
    set((state) => {
      const pending = new Map(state.pendingImageUploads)
      const existing = pending.get(localUri)
      if (!existing) {
        return {}
      }
      const entry = clonePendingEntry(existing)
      const tempMeta = entry.items.get(tempId)
      if (!tempMeta) {
        return {}
      }
      entry.items.delete(tempId)
      entry.items.set(realId, { backlog: tempMeta.backlog, type: 'real' })
      remoteUrlToFinalize = entry.remoteUrl
      pending.set(localUri, entry)
      return {
        pendingImageUploads: pending,
      }
    })
    if (remoteUrlToFinalize) {
      void get().finalizePendingImageUpload(localUri, remoteUrlToFinalize)
    }
  },
  finalizePendingImageUpload: async (localUri, remoteUrl) => {
    const stateBefore = get()
    const existing = stateBefore.pendingImageUploads.get(localUri)
    if (!existing) {
      set((state) => {
        const pending = new Map(state.pendingImageUploads)
        pending.set(localUri, {
          localUri,
          creatorId: stateBefore.user?.id ?? pocketbase.authStore.record?.id,
          userName: stateBefore.user?.userName ?? (pocketbase.authStore.record as any)?.userName,
          remoteUrl,
          items: new Map<string, PendingImageMeta>(),
        })
        return { pendingImageUploads: pending }
      })
      return
    }
    const entry = clonePendingEntry(existing)
    entry.remoteUrl = remoteUrl
    const itemsMeta = Array.from(entry.items.entries())
    if (itemsMeta.length === 0) {
      set((state) => {
        const pending = new Map(state.pendingImageUploads)
        const nextEntry = clonePendingEntry(entry)
        pending.set(localUri, nextEntry)
        return { pendingImageUploads: pending }
      })
      return
    }

    const itemMetaMap = new Map(itemsMeta)
    const realItemIds = itemsMeta.filter(([, meta]) => meta.type === 'real').map(([id]) => id)
    const tempItemIds = itemsMeta.filter(([, meta]) => meta.type === 'temp').map(([id]) => id)
    const uploadingRemovals = new Set([...realItemIds, ...tempItemIds])
    const allReal = tempItemIds.length === 0

    set((state) => {
      const pending = new Map(state.pendingImageUploads)
      const currentEntry = pending.get(localUri)
      if (!currentEntry) {
        return {}
      }
      const mutableEntry = clonePendingEntry(currentEntry)
      mutableEntry.remoteUrl = remoteUrl

      const nextOptimistic = new Map(state.optimisticItems)
      const uploadingItems = new Set(state.uploadingItems)

      uploadingRemovals.forEach((itemId) => {
        const optimisticItem = nextOptimistic.get(itemId)
        if (optimisticItem) {
          const updatedItem: ExpandedItem = {
            ...optimisticItem,
            image: remoteUrl,
            expand: optimisticItem.expand
              ? {
                  ...optimisticItem.expand,
                  ref: optimisticItem.expand.ref
                    ? { ...optimisticItem.expand.ref, image: remoteUrl }
                    : optimisticItem.expand.ref,
                }
              : optimisticItem.expand,
          }
          nextOptimistic.set(itemId, updatedItem)
        }
      })

      uploadingRemovals.forEach((id) => uploadingItems.delete(id))

      if (allReal) {
        pending.delete(localUri)
      } else {
        pending.set(localUri, mutableEntry)
      }

      return {
        pendingImageUploads: pending,
        optimisticItems: nextOptimistic,
        uploadingItems,
      }
    })

    const creatorId =
      entry.creatorId ??
      pocketbase.authStore.record?.id ??
      stateBefore.user?.id ??
      ''
    const creatorUserName =
      entry.userName ?? (pocketbase.authStore.record as any)?.userName ?? stateBefore.user?.userName

    if (creatorId) {
      try {
        const snapshot = ensureProfileSnapshot(creatorId, creatorUserName)
        let gridChanged = false
        let backlogChanged = false

        const updateList = (list: ExpandedItem[], backlogFlag: boolean) =>
          list.map((item) => {
            const meta = itemMetaMap.get(item.id)
            if (meta && meta.backlog === backlogFlag) {
              const updatedItem: ExpandedItem = {
                ...item,
                image: remoteUrl,
                expand: item.expand
                  ? {
                      ...item.expand,
                      ref: item.expand.ref ? { ...item.expand.ref, image: remoteUrl } : item.expand.ref,
                    }
                  : item.expand,
              }
              if (backlogFlag) {
                backlogChanged = true
              } else {
                gridChanged = true
              }
              return updatedItem
            }
            return item
          })

        const updatedGridItems = updateList(snapshot.gridItems, false)
        const updatedBacklogItems = updateList(snapshot.backlogItems, true)

        if (gridChanged || backlogChanged) {
          await writeProfileSnapshot({
            userId: creatorId,
            userName: creatorUserName,
            profile: snapshot.profile,
            gridItems: updatedGridItems,
            backlogItems: updatedBacklogItems,
            updatedAt: Date.now(),
          })
        }
      } catch (error) {
        console.warn('Failed to update profile snapshot after image upload', error)
      }

      queryClient
        .invalidateQueries({
          queryKey: buildProfileQueryKey(creatorId),
        })
        .catch((error) => {
          if (__DEV__) {
            console.warn('Failed to invalidate profile query after image upload', error)
          }
        })
    }

    if (realItemIds.length > 0) {
      await Promise.all(
        realItemIds.map((id) =>
          pocketbase
            .collection('items')
            .update(id, { image: remoteUrl })
            .catch((error) => {
              console.warn('Failed to update item image after upload', { id, error })
            })
        )
      )
      get().triggerFeedRefresh()
    }
  },
  failPendingImageUpload: (localUri) => {
    set((state) => {
      const pending = new Map(state.pendingImageUploads)
      const entry = pending.get(localUri)
      if (!entry) {
        return {}
      }
      const uploadingItems = new Set(state.uploadingItems)
      entry.items.forEach((_meta, itemId) => {
        uploadingItems.delete(itemId)
      })
      pending.delete(localUri)
      return {
        pendingImageUploads: pending,
        uploadingItems,
      }
    })
  },
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
    if (isInteractionGateActive()) {
      if (__DEV__) {
        console.log('[gate] drop feed refresh')
      }
      return
    }
    const scheduleRefresh = () => {
      pendingFeedRefresh = null
      set((state) => ({ feedRefreshTrigger: state.feedRefreshTrigger + 1 }))
      const refreshFeed = get().refreshFeed
      if (typeof refreshFeed === 'function') {
        refreshFeed({ force: true, silent: true }).catch((error: unknown) => {
          console.warn('Feed refresh failed after item change', error)
        })
      }
    }

    if (pendingFeedRefresh) {
      pendingFeedRefresh.cancel?.()
      pendingFeedRefresh = null
    }

    pendingFeedRefresh = scheduleAfterInteractions(scheduleRefresh)
  },
  triggerProfileRefresh: () => {
    if (isInteractionGateActive()) {
      if (__DEV__) {
        console.log('[gate] drop profile refresh')
      }
      return
    }
    const scheduleRefresh = () => {
      pendingProfileRefresh = null
      set((state) => ({ profileRefreshTrigger: state.profileRefreshTrigger + 1 }))
    }

    if (pendingProfileRefresh) {
      pendingProfileRefresh.cancel?.()
      pendingProfileRefresh = null
    }

    pendingProfileRefresh = scheduleAfterInteractions(scheduleRefresh)
  },
  addToProfile: async (refId: string | null, itemFields: StagedItemFields, backlog: boolean) => {
    const authRecord = pocketbase.authStore.record
    if (!authRecord?.id) {
      throw new Error('User not found')
    }

    const userId = authRecord.id
    const userName = (authRecord as any)?.userName
    const previousSnapshot = ensureProfileSnapshot(userId, userName)
    const tempId = `temp_${nanoid(10)}`
    const optimisticItem = buildOptimisticItem({
      tempId,
      refId,
      creatorId: userId,
      itemFields,
      backlog,
    })
    const localUri = isLikelyLocalImageUri(itemFields.image) ? itemFields.image : undefined

    beginProfileMutation()

    if (!backlog) {
      get().incrementGridItemCount()
    }

    if (localUri) {
      get().notePendingImageForItem(localUri, {
        itemId: optimisticItem.id,
        backlog,
        type: 'temp',
        creatorId: userId,
        userName,
      })
      get().addUploadingItem(optimisticItem.id)
    }

    get().addOptimisticItem(optimisticItem)

    const optimisticSnapshot = applyOptimisticAdd(previousSnapshot, optimisticItem, backlog)
    await writeProfileSnapshot({
      userId,
      userName,
      profile: optimisticSnapshot.profile,
      gridItems: optimisticSnapshot.gridItems,
      backlogItems: optimisticSnapshot.backlogItems,
      updatedAt: Date.now(),
    })

    try {
      let linkedRefId = refId
      if (!linkedRefId) {
        const newRef = await get().createRef({
          title: itemFields.title || '',
          meta: itemFields.meta || '{}',
          image: itemFields.image,
        })
        linkedRefId = newRef.id
      }

      const createdItem = await get().createItem(linkedRefId, itemFields, backlog)
      get().replaceOptimisticItem(optimisticItem.id, createdItem)

      if (localUri) {
        get().transitionPendingImageToReal(localUri, optimisticItem.id, createdItem.id)
        get().removeUploadingItem(optimisticItem.id)
        const pendingEntry = get().pendingImageUploads.get(localUri)
        if (pendingEntry && !pendingEntry.remoteUrl) {
          get().addUploadingItem(createdItem.id)
        } else if (pendingEntry?.remoteUrl) {
          void get().finalizePendingImageUpload(localUri, pendingEntry.remoteUrl)
        } else {
          get().removeUploadingItem(createdItem.id)
        }
      } else {
        get().removeUploadingItem(optimisticItem.id)
      }

      const canonicalSnapshot: ProfileSnapshotPayload = backlog
        ? {
            userId,
            userName,
            profile: optimisticSnapshot.profile,
            gridItems: optimisticSnapshot.gridItems,
            backlogItems: optimisticSnapshot.backlogItems.map((item) =>
              item.id === optimisticItem.id ? { ...createdItem, backlog: true } : item
            ),
            updatedAt: Date.now(),
          }
        : {
            userId,
            userName,
            profile: optimisticSnapshot.profile,
            gridItems: gridSort(
              optimisticSnapshot.gridItems.map((item) =>
                item.id === optimisticItem.id ? createdItem : item
              )
            ),
            backlogItems: optimisticSnapshot.backlogItems,
            updatedAt: Date.now(),
          }

      await writeProfileSnapshot(canonicalSnapshot)
      console.log('[items][add] ok', { tempId: optimisticItem.id, id: createdItem.id })

      get().triggerFeedRefresh()
      queryClient.invalidateQueries({
        queryKey: buildProfileQueryKey(userId),
      }).catch((error) => {
        if (__DEV__) {
          console.warn('Failed to invalidate profile query after add', error)
        }
      })

      if (!backlog) {
        scheduleAfterInteractions(() => {
          updateShowInDirectory(userId).catch((error) => {
            console.warn('Failed to update show_in_directory:', error)
          })
        })
      }

      return createdItem
    } catch (error) {
      if (localUri) {
        get().failPendingImageUpload(localUri)
        get().removeUploadingItem(optimisticItem.id)
      }
      get().removeOptimisticItem(optimisticItem.id)
      await writeProfileSnapshot({
        userId,
        userName,
        profile: previousSnapshot.profile,
        gridItems: previousSnapshot.gridItems,
        backlogItems: previousSnapshot.backlogItems,
        updatedAt: Date.now(),
      })

      if (!backlog) {
        get().decrementGridItemCount()
      }
      throw error
    } finally {
      endProfileMutation()
    }
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
    const authRecord = pocketbase.authStore.record
    if (!authRecord?.id) {
      throw new Error('User not found')
    }

    const userId = authRecord.id
    const userName = (authRecord as any)?.userName
    const previousSnapshot = ensureProfileSnapshot(userId, userName)
    const itemFromGrid = previousSnapshot.gridItems.find((entry) => entry.id === id)
    const itemFromBacklog = previousSnapshot.backlogItems.find((entry) => entry.id === id)
    const isBacklog = Boolean(itemFromBacklog?.backlog || (!itemFromGrid && itemFromBacklog))

    beginProfileMutation()

    const optimisticSnapshot = applyOptimisticRemoval(previousSnapshot, id, { backlog: isBacklog })
    await writeProfileSnapshot({
      userId,
      userName,
      profile: optimisticSnapshot.profile,
      gridItems: optimisticSnapshot.gridItems,
      backlogItems: optimisticSnapshot.backlogItems,
      updatedAt: Date.now(),
    })

    if (id.startsWith('temp_')) {
      get().removeOptimisticItem(id)
      endProfileMutation()
      return
    }

    recordDeletedTombstone(id)
    get().removeOptimisticItem(id)

    let decrementedGridCount = false
    try {
      const itemRecord = await pocketbase.collection('items').getOne(id)

      if (itemRecord.list) {
        const children = await pocketbase
          .collection('items')
          .getFullList({ filter: `parent = "${id}"` })
        for (const child of children) {
          await pocketbase.collection('items').delete(child.id)
        }
      }

      await pocketbase.collection('items').delete(id)

      if (!isBacklog) {
        get().decrementGridItemCount()
        decrementedGridCount = true
        scheduleAfterInteractions(() => {
          updateShowInDirectory(userId).catch((error) => {
            console.warn('Failed to update show_in_directory:', error)
          })
        })
      }

      await writeProfileSnapshot({
        userId,
        userName,
        profile: optimisticSnapshot.profile,
        gridItems: optimisticSnapshot.gridItems,
        backlogItems: optimisticSnapshot.backlogItems,
        updatedAt: Date.now(),
      })

      console.log('[items][delete] ok', { id })
      get().triggerFeedRefresh()
      queryClient.invalidateQueries({
        queryKey: buildProfileQueryKey(userId),
      }).catch((error) => {
        if (__DEV__) {
          console.warn('Failed to invalidate profile query after delete', error)
        }
      })
    } catch (error) {
      await writeProfileSnapshot({
        userId,
        userName,
        profile: previousSnapshot.profile,
        gridItems: previousSnapshot.gridItems,
        backlogItems: previousSnapshot.backlogItems,
        updatedAt: Date.now(),
      })
      if (!isBacklog) {
        // Only revert the grid count if we previously decremented it during this removal.
        if (decrementedGridCount) {
          get().incrementGridItemCount()
        }
      }
      throw error
    } finally {
      endProfileMutation()
    }
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
    const authRecord = pocketbase.authStore.record
    if (!authRecord?.id) {
      throw new Error('User not found')
    }

    if (id.startsWith('temp-') || id.startsWith('temp_')) {
      get().removeOptimisticItem(id)
      return null as any
    }

    const userId = authRecord.id
    const userName = (authRecord as any)?.userName
    const previousSnapshot = ensureProfileSnapshot(userId, userName)
    const targetItem = previousSnapshot.gridItems.find((entry) => entry.id === id)

    if (!targetItem) {
      throw new Error('Item not found in snapshot')
    }

    beginProfileMutation()

    const optimisticSnapshot = applyOptimisticMoveToBacklog(previousSnapshot, targetItem)
    await writeProfileSnapshot({
      userId,
      userName,
      profile: optimisticSnapshot.profile,
      gridItems: optimisticSnapshot.gridItems,
      backlogItems: optimisticSnapshot.backlogItems,
      updatedAt: Date.now(),
    })

    get().removeOptimisticItem(id)

    try {
      const record = await pocketbase.collection<ItemsRecord>('items').update(id, { backlog: true })
      get().decrementGridItemCount()

      scheduleAfterInteractions(() => {
        updateShowInDirectory(userId).catch((error) => {
          console.warn('Failed to update show_in_directory:', error)
        })
      })

      get().triggerFeedRefresh()

      await writeProfileSnapshot({
        userId,
        userName,
        profile: optimisticSnapshot.profile,
        gridItems: optimisticSnapshot.gridItems,
        backlogItems: optimisticSnapshot.backlogItems,
        updatedAt: Date.now(),
      })

      queryClient.invalidateQueries({
        queryKey: buildProfileQueryKey(userId),
      }).catch((error) => {
        if (__DEV__) {
          console.warn('Failed to invalidate profile query after moveToBacklog', error)
        }
      })

      return record
    } catch (error) {
      await writeProfileSnapshot({
        userId,
        userName,
        profile: previousSnapshot.profile,
        gridItems: previousSnapshot.gridItems,
        backlogItems: previousSnapshot.backlogItems,
        updatedAt: Date.now(),
      })
      throw error
    } finally {
      endProfileMutation()
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
  const shouldForceNetwork = forceNetwork || consumeProfileGridDirty(effectiveUserId)

  if (!shouldForceNetwork && effectiveUserId) {
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
  const rawItems = items.items as unknown as ExpandedItem[]
  const sorted = gridSort([...rawItems])
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
  const rawItems = items.items as unknown as ExpandedItem[]
  const sorted = [...rawItems].sort(createdSort)
  const compacted = sorted.map(compactGridItem)
  if (effectiveUserId) {
    void simpleCache.set('backlog_items', compacted, effectiveUserId)
  }
  return compacted
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
