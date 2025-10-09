import { StateCreator } from 'zustand'

import { simpleCache } from '@/features/cache/simpleCache'
import { pocketbase } from '@/features/pocketbase'
import { supabase } from '@/features/supabase/client'
import type { StoreSlices } from './types'
import type { ExpandedItem, Profile, CompleteRef } from '@/features/types'

const FEED_PAGE_SIZE = 15

type FeedActor = {
  id: string
  userName: string
  firstName?: string
  lastName?: string
  displayName: string
  avatar?: string
  image?: string
}

type FeedRef = {
  id: string
  title: string
  image?: string
}

type RefAddEntry = {
  id: string
  kind: 'ref_add'
  created: string
  itemId: string
  actor: FeedActor
  ref: FeedRef
}

type InterestJoinEntry = {
  id: string
  kind: 'interest_join'
  created: string
  subscriptionId: string
  actor: FeedActor
  ref: FeedRef
  community?: string | null
}

export type FeedEntry = RefAddEntry | InterestJoinEntry

export type FeedSlice = {
  feedEntries: FeedEntry[]
  feedActorCache: Record<string, FeedActor>
  feedRefCache: Record<string, FeedRef>
  feedHydrated: boolean
  feedHydrating: boolean
  feedRefreshing: boolean
  feedPrefetching: boolean
  feedLoadingMore: boolean
  feedHasMore: boolean
  feedCursor: string | null
  feedPrefetchedPage: {
    entries: FeedEntry[]
    cursor: string | null
    hasMore: boolean
    actorCache: Record<string, FeedActor>
    refCache: Record<string, FeedRef>
  } | null
  feedNetworkEnabled: boolean
  enableFeedNetwork: () => void
  ensureFeedHydrated: (options?: { refresh?: boolean }) => Promise<void>
  refreshFeed: (options?: { force?: boolean; silent?: boolean }) => Promise<void>
  prefetchNextFeedPage: () => Promise<void>
  consumePrefetchedFeedPage: () => void
  fetchMoreFeed: () => Promise<void>
  invalidateFeedCache: () => Promise<void>
  resetFeed: () => void
}

type CachedFeedSnapshot = {
  entries: FeedEntry[]
  cursor: string | null
  hasMore: boolean
}

type RawSubscriptionRow = {
  id: string
  ref_id: string
  user_id: string
  community?: string | null
  inserted_at: string
}

const normalizeDisplayName = (record: Profile): string => {
  const parts = [record.firstName, record.lastName].filter(Boolean).map((value) => (value || '').trim())
  if (parts.length > 0) {
    return parts.join(' ')
  }
  if ((record as any).name && typeof (record as any).name === 'string' && (record as any).name.trim()) {
    return ((record as any).name as string).trim()
  }
  return record.userName || 'Someone'
}

const ensureActor = (
  cache: Record<string, FeedActor>,
  record?: Profile | null
): FeedActor | null => {
  if (!record) {
    return null
  }

  const cached = cache[record.id]
  if (cached) {
    return cached
  }

  const avatarCandidate = [record.image, (record as any).avatar_url]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find((value) => value)

  const actor: FeedActor = {
    id: record.id,
    userName: record.userName,
    firstName: record.firstName,
    lastName: record.lastName,
    displayName: normalizeDisplayName(record),
    avatar: avatarCandidate,
    image: typeof record.image === 'string' ? record.image : undefined,
  }

  cache[record.id] = actor
  return actor
}

const ensureRef = (
  cache: Record<string, FeedRef>,
  record?: CompleteRef | null
): FeedRef | null => {
  if (!record) {
    return null
  }

  const cached = cache[record.id]
  if (cached) {
    return cached
  }

  const ref: FeedRef = {
    id: record.id,
    title: record.title || 'Untitled',
    image: typeof record.image === 'string' ? record.image : undefined,
  }

  cache[record.id] = ref
  return ref
}

const formatPocketBaseDate = (isoDate: string): string => isoDate.replace('T', ' ')

const loadUsersByIds = async (ids: string[]): Promise<Record<string, Profile>> => {
  if (!ids.length) {
    return {}
  }

  const filter = ids.map((id) => `id = "${id}"`).join(' || ')
  try {
    const records = await pocketbase.collection<Profile>('users').getFullList(
      Math.min(200, Math.max(ids.length, 1)),
      {
        filter,
        sort: '-created',
      }
    )
    return records.reduce<Record<string, Profile>>((acc, record) => {
      acc[record.id] = record
      return acc
    }, {})
  } catch (error) {
    console.warn('Feed: failed to load users', error)
    return {}
  }
}

const loadRefsByIds = async (ids: string[]): Promise<Record<string, CompleteRef>> => {
  if (!ids.length) {
    return {}
  }

  const filter = ids.map((id) => `id = "${id}"`).join(' || ')
  try {
    const records = await pocketbase.collection<CompleteRef>('refs').getFullList(
      Math.min(200, Math.max(ids.length, 1)),
      {
        filter,
        sort: '-created',
      }
    )
    return records.reduce<Record<string, CompleteRef>>((acc, record) => {
      acc[record.id] = record
      return acc
    }, {})
  } catch (error) {
    console.warn('Feed: failed to load refs', error)
    return {}
  }
}

const fetchSubscriptionRows = async (
  before: string | null,
  limit: number
): Promise<{ rows: RawSubscriptionRow[]; hasMore: boolean }> => {
  const client = supabase.client
  if (!client) {
    return { rows: [], hasMore: false }
  }

  try {
    let query = client
      .from('community_subscriptions')
      .select('id, ref_id, user_id, community, inserted_at')
      .order('inserted_at', { ascending: false })
      .limit(limit * 2)

    if (before) {
      query = query.lt('inserted_at', before)
    }

    const { data, error } = await query
    if (error) {
      console.warn('Feed: failed to load interest subscriptions', error)
      return { rows: [], hasMore: false }
    }

    const rows = Array.isArray(data) ? (data as RawSubscriptionRow[]) : []
    return {
      rows,
      hasMore: rows.length >= limit,
    }
  } catch (error) {
    console.warn('Feed: subscription query failed', error)
    return { rows: [], hasMore: false }
  }
}

type FeedPageResult = {
  entries: FeedEntry[]
  cursor: string | null
  hasMore: boolean
  actorCache: Record<string, FeedActor>
  refCache: Record<string, FeedRef>
}

export const createFeedSlice: StateCreator<StoreSlices, [], [], FeedSlice> = (set, get) => ({
  feedEntries: [],
  feedActorCache: {},
  feedRefCache: {},
  feedHydrated: false,
  feedHydrating: false,
  feedRefreshing: false,
  feedPrefetching: false,
  feedLoadingMore: false,
  feedHasMore: true,
  feedCursor: null,
  feedPrefetchedPage: null,
  feedNetworkEnabled: false,
  ensureFeedHydrated: async ({ refresh = true }: { refresh?: boolean } = {}) => {
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      return
    }

    const state = get()
    if (state.feedHydrating) {
      return
    }

    if (state.feedHydrated && state.feedEntries.length > 0) {
      return
    }

    set(() => ({ feedHydrating: true }))

    try {
      const cached = await simpleCache.get<CachedFeedSnapshot>('feed_entries', userId)
      const debugMarkers: FeedEntry[] = []
      const start = Date.now()
      if (cached) {
        debugMarkers.push({
          id: `meta:cached-${start}`,
          kind: 'ref_add',
          created: new Date(start).toISOString(),
          itemId: `cached-${start}`,
          actor: {
            id: 'meta',
            userName: 'cache',
            displayName: '[feed] applying cache',
          },
          ref: {
            id: 'meta-cache',
            title: `${cached.entries.length} entries`,
          },
        } as FeedEntry)
      }
      if (cached && Array.isArray(cached.entries) && cached.entries.length > 0) {
        const actorCache = { ...state.feedActorCache }
        const refCache = { ...state.feedRefCache }
        for (const entry of cached.entries) {
          actorCache[entry.actor.id] = entry.actor
          if (entry.ref) {
            refCache[entry.ref.id] = entry.ref
          }
        }

        set(() => ({
          feedEntries: [...debugMarkers, ...cached.entries],
          feedActorCache: actorCache,
          feedRefCache: refCache,
          feedHydrated: true,
          feedHasMore: cached.hasMore,
          feedCursor: cached.cursor ?? cached.entries[cached.entries.length - 1]?.created ?? null,
        }))
      }

      if (refresh && get().feedNetworkEnabled) {
        const refreshStart = Date.now()
        await get().refreshFeed({ force: true, silent: true })
        const refreshEnd = Date.now()
        set((state) => ({
          feedEntries: [
            {
              id: `meta:refresh-${refreshStart}`,
              kind: 'ref_add',
              created: new Date(refreshEnd).toISOString(),
              itemId: `refresh-${refreshStart}`,
              actor: {
                id: 'meta',
                userName: 'refresh',
                displayName: `[feed] refresh took ${(refreshEnd - refreshStart).toFixed(0)}ms`,
              },
              ref: {
                id: 'meta-refresh',
                title: 'Network timings',
              },
            } as FeedEntry,
            ...state.feedEntries,
          ],
        }))
      }
    } catch (error) {
      console.warn('Feed: failed to hydrate', error)
    } finally {
      set(() => ({ feedHydrating: false }))
    }
  },
  refreshFeed: async ({ force = false, silent = false } = {}) => {
    if (!get().feedNetworkEnabled) {
      return
    }
    const userId = pocketbase.authStore.record?.id
    if (!userId) {
      return
    }

    if (get().feedRefreshing && !force) {
      return
    }

    if (!silent) {
      set(() => ({ feedRefreshing: true }))
    }

    try {
      const t0 = Date.now()
      const page = await fetchFeedPage(null, FEED_PAGE_SIZE, get)
      const t1 = Date.now()

      set(() => ({
        feedEntries: [
          {
            id: `meta:refresh-page-${t0}`,
            kind: 'ref_add',
            created: new Date(t1).toISOString(),
            itemId: `refresh-page-${t0}`,
            actor: {
              id: 'meta',
              userName: 'refresh',
              displayName: `[feed] fetchFeedPage ${FEED_PAGE_SIZE} in ${(t1 - t0).toFixed(0)}ms`,
            },
            ref: {
              id: 'meta-fetch',
              title: 'Stage timings',
            },
          } as FeedEntry,
          ...page.entries,
        ],
        feedActorCache: page.actorCache,
        feedRefCache: page.refCache,
        feedHydrated: true,
        feedRefreshing: false,
        feedHasMore: page.hasMore,
        feedCursor: page.cursor,
        feedPrefetchedPage: null,
        feedPrefetching: false,
      }))

      await simpleCache.set<CachedFeedSnapshot>('feed_entries', {
        entries: page.entries,
        cursor: page.cursor,
        hasMore: page.hasMore,
      }, userId)
    } catch (error) {
      console.warn('Feed: refresh failed', error)
      set(() => ({ feedRefreshing: false }))
    }
  },
  prefetchNextFeedPage: async () => {
    const state = get()
    if (!state.feedNetworkEnabled || !state.feedHasMore || state.feedPrefetching || state.feedLoadingMore) {
      return
    }

    set(() => ({ feedPrefetching: true }))

    try {
      const page = await fetchFeedPage(state.feedCursor, FEED_PAGE_SIZE, get)
      if (!page.entries.length) {
        set(() => ({ feedPrefetching: false, feedHasMore: page.hasMore, feedCursor: page.cursor }))
        return
      }

      const existingIds = new Set(state.feedEntries.map((entry) => entry.id))
      const filtered = page.entries.filter((entry) => !existingIds.has(entry.id))

      set(() => ({
        feedPrefetchedPage: {
          entries: filtered,
          cursor: page.cursor,
          hasMore: page.hasMore,
          actorCache: page.actorCache,
          refCache: page.refCache,
        },
        feedPrefetching: false,
      }))
    } catch (error) {
      console.warn('Feed: prefetch failed', error)
      set(() => ({ feedPrefetching: false }))
    }
  },
  consumePrefetchedFeedPage: () => {
    const state = get()
    const page = state.feedPrefetchedPage
    if (!page || !page.entries.length) {
      return
    }

    set(() => ({
      feedEntries: [...state.feedEntries, ...page.entries],
      feedActorCache: page.actorCache,
      feedRefCache: page.refCache,
      feedCursor: page.cursor,
      feedHasMore: page.hasMore,
      feedPrefetchedPage: null,
    }))
  },
  fetchMoreFeed: async () => {
    const state = get()
    if (!state.feedNetworkEnabled || !state.feedHasMore || state.feedLoadingMore) {
      return
    }

    if (state.feedPrefetchedPage && state.feedPrefetchedPage.entries.length) {
      set(() => ({ feedLoadingMore: true }))
      set(() => ({ feedLoadingMore: false }))
      get().consumePrefetchedFeedPage()
      void get().prefetchNextFeedPage()
      return
    }

    set(() => ({ feedLoadingMore: true }))
    try {
      const page = await fetchFeedPage(state.feedCursor, FEED_PAGE_SIZE, get)
      if (page.entries.length) {
        const existingIds = new Set(state.feedEntries.map((entry) => entry.id))
        const filtered = page.entries.filter((entry) => !existingIds.has(entry.id))
        set(() => ({
          feedEntries: [...state.feedEntries, ...filtered],
          feedActorCache: page.actorCache,
          feedRefCache: page.refCache,
          feedCursor: page.cursor,
          feedHasMore: page.hasMore,
        }))
        void get().prefetchNextFeedPage()
      } else {
        set(() => ({ feedHasMore: page.hasMore, feedCursor: page.cursor }))
      }
    } catch (error) {
      console.warn('Feed: load more failed', error)
    } finally {
      set(() => ({ feedLoadingMore: false }))
    }
  },
  invalidateFeedCache: async () => {
    const userId = pocketbase.authStore.record?.id
    set(() => ({
      feedEntries: [],
      feedHydrated: false,
      feedHydrating: false,
      feedHasMore: true,
      feedCursor: null,
      feedPrefetchedPage: null,
    }))
    if (userId) {
      try {
        await simpleCache.set<CachedFeedSnapshot>('feed_entries', {
          entries: [],
          cursor: null,
          hasMore: true,
        }, userId)
      } catch (error) {
        console.warn('Feed: failed to invalidate cache', error)
      }
    }
  },
  resetFeed: () => {
    set(() => ({
      feedEntries: [],
      feedActorCache: {},
      feedRefCache: {},
      feedHydrated: false,
      feedHydrating: false,
      feedRefreshing: false,
      feedPrefetching: false,
      feedLoadingMore: false,
      feedHasMore: true,
      feedCursor: null,
      feedPrefetchedPage: null,
      feedNetworkEnabled: false,
    }))
  },
  enableFeedNetwork: () => {
    set(() => ({ feedNetworkEnabled: true }))
  },
})

const fetchFeedPage = async (
  before: string | null,
  limit: number,
  get: () => StoreSlices
): Promise<FeedPageResult> => {
  const state = get()
  const actorCache = { ...state.feedActorCache }
  const refCache = { ...state.feedRefCache }

  const filterParts = [
    'creator != ""',
    'backlog = false',
    'list = false',
    'parent = null',
  ]
  if (before) {
    filterParts.push(`created < "${formatPocketBaseDate(before)}"`)
  }
  const filter = filterParts.join(' && ')

  let itemEntries: RefAddEntry[] = []
  let itemsHasMore = false

  try {
    const response = await pocketbase.collection<ExpandedItem>('items').getList(1, limit * 2, {
      filter,
      sort: '-created',
      expand: 'ref,creator',
    })

    const seenItemIds = new Set<string>()
    const entries: RefAddEntry[] = []

    for (const item of response.items) {
      if (!item.id || seenItemIds.has(item.id)) {
        continue
      }
      seenItemIds.add(item.id)

      const actor = ensureActor(actorCache, item.expand?.creator || (item as any).expand?.creator)
      const ref = ensureRef(refCache, item.expand?.ref || (item as any).expand?.ref)

      if (!actor || !ref) {
        continue
      }

      entries.push({
        id: `item:${item.id}`,
        kind: 'ref_add',
        created: item.created,
        itemId: item.id,
        actor,
        ref,
      })
    }

    itemEntries = entries
    itemsHasMore = response.totalItems > response.page * response.perPage
  } catch (error) {
    console.warn('Feed: failed to load items', error)
  }


  const includeInterestJoins = false
  const { rows: subscriptionRows, hasMore: subscriptionsHasMore } = includeInterestJoins
    ? await fetchSubscriptionRows(before, limit)
    : { rows: [] as RawSubscriptionRow[], hasMore: false }

  let subscriptionEntries: InterestJoinEntry[] = []
  if (includeInterestJoins && subscriptionRows.length) {
    const userIds = Array.from(new Set(subscriptionRows.map((row) => row.user_id))).filter(
      (id) => id && !actorCache[id]
    )
    const refIds = Array.from(new Set(subscriptionRows.map((row) => row.ref_id))).filter(
      (id) => id && !refCache[id]
    )

    const [userRecords, refRecords] = await Promise.all([
      loadUsersByIds(userIds),
      loadRefsByIds(refIds),
    ])

    const entries: InterestJoinEntry[] = []
    const seenSubscriptionIds = new Set<string>()

    for (const row of subscriptionRows) {
      if (!row.id || seenSubscriptionIds.has(row.id)) {
        continue
      }
      if (!row.inserted_at) {
        continue
      }
      seenSubscriptionIds.add(row.id)

      const actorRecord = userRecords[row.user_id]
      const refRecord = refRecords[row.ref_id]
      const actor = actorRecord
        ? ensureActor(actorCache, actorRecord)
        : actorCache[row.user_id] || null
      const ref = refRecord ? ensureRef(refCache, refRecord) : refCache[row.ref_id] || null

      if (!actor || !ref) {
        continue
      }

      entries.push({
        id: `interest:${row.id}`,
        kind: 'interest_join',
        created: row.inserted_at,
        subscriptionId: row.id,
        actor,
        ref,
        community: row.community ?? null,
      })
    }

    subscriptionEntries = entries
  }

  const combined = [...itemEntries, ...subscriptionEntries]
  combined.sort((a, b) => (a.created > b.created ? -1 : a.created < b.created ? 1 : 0))

  const uniqueEntries: FeedEntry[] = []
  const seenIds = new Set<string>()
  for (const entry of combined) {
    if (seenIds.has(entry.id)) {
      continue
    }
    seenIds.add(entry.id)
    uniqueEntries.push(entry)
    if (uniqueEntries.length === limit) {
      break
    }
  }

  const lastEntry = uniqueEntries[uniqueEntries.length - 1] || null
  const hasMore =
    subscriptionsHasMore ||
    itemsHasMore ||
    combined.length > uniqueEntries.length

  return {
    entries: uniqueEntries,
    cursor: lastEntry ? lastEntry.created : before,
    hasMore,
    actorCache,
    refCache,
  }
}
