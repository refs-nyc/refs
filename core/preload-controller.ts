import { InteractionManager } from 'react-native'

import { queryClient } from '@/core/queryClient'
import { useAppStore } from '@/features/stores'
import type { InfiniteData } from '@tanstack/react-query'

import { directoryKeys, fetchDirectoryPage } from '@/features/queries/directory'
import {
  messagingKeys,
  fetchConversationsPage,
  buildConversationPreview,
  type ConversationPreviewEntry,
} from '@/features/queries/messaging'
import { profileKeys, fetchProfileData } from '@/features/queries/profile'
import { wantToMeetKeys, fetchWantToMeet } from '@/features/queries/wantToMeet'
import { communityInterestsKeys, fetchCommunityInterestSummary } from '@/features/queries/communityInterests'
import { pocketbase } from '@/features/pocketbase'
import { withTiming, clearTimingSamples, getTimingReport } from '@/features/queries/instrumentation'
import { enqueueIdleTask, getIdleQueueStats } from '@/features/utils/idleQueue'
import { enqueueHydratorJob } from '@/core/hydratorQueue'
import { putSnapshot, snapshotKeys } from '@/features/cache/snapshotStore'
import { DEFAULT_COMMUNITY } from '@/core/bootstrap/seedSnapshots'

type DirectoryPage = Awaited<ReturnType<typeof fetchDirectoryPage>>
type ConversationsPage = Awaited<ReturnType<typeof fetchConversationsPage>>

let realtimeStarted = false
let authSubscription: (() => void) | null = null

const INLINE_CONVERSATION_HYDRATE_COUNT = 3
const STALE_THRESHOLD_MS = 45_000
const PERF_TRACE = process.env.EXPO_PUBLIC_PERF_HARNESS === '1'

const logProfileHydratorPerf = (
  label: string,
  startedAt: number,
  extra?: Record<string, unknown>
) => {
  if (!PERF_TRACE) return
  const duration = Date.now() - startedAt
  console.log('[profile][hydrator]', label, extra ? { duration, ...extra } : { duration })
}

const hydrateConversationPreviews = async (userId: string) => {
  const key = messagingKeys.conversations(userId)
  const data = queryClient.getQueryData<InfiniteData<ConversationsPage>>(key)
  const pages = data?.pages ?? []
  if (!pages.length) return

  const seen = new Set<string>()
  const uniqueEntries: ConversationPreviewEntry[] = []

  for (const page of pages) {
    for (const entry of page.entries) {
      const conversationId = entry.conversation.id
      if (!conversationId || seen.has(conversationId)) continue
      seen.add(conversationId)
      uniqueEntries.push(entry)
    }
  }

  if (!uniqueEntries.length) return

  const pendingEntries = uniqueEntries.filter((entry) => !entry.latestMessage)
  if (!pendingEntries.length) return

  const writePreviewToCache = (preview: ConversationPreviewEntry) => {
    queryClient.setQueryData<InfiniteData<ConversationsPage>>(key, (current) => {
      if (!current) return current
      return {
        ...current,
        pages: current.pages.map((page) => {
          const index = page.entries.findIndex(
            (candidate) => candidate.conversation.id === preview.conversation.id
          )
          if (index === -1) return page
          const nextEntries = [...page.entries]
          nextEntries[index] = preview
          return { ...page, entries: nextEntries }
        }),
      }
    })
  }

  const hydrateEntry = async (entry: ConversationPreviewEntry) => {
    try {
      const preview = await buildConversationPreview(entry.conversation, userId)
      writePreviewToCache(preview)
    } catch (error) {
      if (__DEV__) {
        console.warn('[preload] messaging preview hydrate failed', error)
      }
    }
  }

  const inlineTargets = pendingEntries.slice(0, INLINE_CONVERSATION_HYDRATE_COUNT)
  const queuedTargets = pendingEntries.slice(INLINE_CONVERSATION_HYDRATE_COUNT)

  for (const entry of inlineTargets) {
    await hydrateEntry(entry)
  }

  queuedTargets.forEach((entry, index) => {
    enqueueIdleTask(() => hydrateEntry(entry), `messaging:hydrate:${entry.conversation.id}:${index}`)
  })
}

const prefetchInterestSummary = () =>
  queryClient.prefetchQuery({
    queryKey: communityInterestsKeys.summary(DEFAULT_COMMUNITY),
    queryFn: () => fetchCommunityInterestSummary(DEFAULT_COMMUNITY),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
  })

const isQueryFresh = (key: unknown, thresholdMs = STALE_THRESHOLD_MS) => {
  const state = queryClient.getQueryState<any>(key as any)
  if (!state?.dataUpdatedAt) {
    return false
  }
  return Date.now() - state.dataUpdatedAt < thresholdMs
}

const hydrateDirectoryFirstPage = async (communityId: string) => {
  if (isQueryFresh(directoryKeys.all)) {
    return
  }

  const startedAt = Date.now()
  const page = await fetchDirectoryPage(1)
  const infiniteData: InfiniteData<DirectoryPage> = {
    pageParams: [1],
    pages: [page],
  }

  const updatedAt = Date.now()
  queryClient.setQueryData(directoryKeys.all, infiniteData, { updatedAt })
  await putSnapshot('directoryFirstPage', snapshotKeys.directoryFirstPage(communityId), page, {
    timestamp: updatedAt,
  })

}

const hydrateProfileSelf = async (userId: string, userName: string) => {
  if (!userId || !userName) return
  if (isQueryFresh(profileKeys.detail(userName))) {
    if (PERF_TRACE) {
      console.log('[profile][hydrator] skip:fresh', { userName })
    }
    return
  }

  const totalStartedAt = PERF_TRACE ? Date.now() : 0
  if (PERF_TRACE) {
    console.log('[profile][hydrator] start', { userId, userName })
  }

  const fetchStartedAt = PERF_TRACE ? Date.now() : 0
  const data = await fetchProfileData(userName, { userId })
  if (PERF_TRACE) {
    logProfileHydratorPerf('fetchProfileData', fetchStartedAt, {
      grid: data.gridItems?.length ?? 0,
      backlog: data.backlogItems?.length ?? 0,
    })
  }
  const updatedAt = Date.now()
  const setQueryStartedAt = PERF_TRACE ? Date.now() : 0
  queryClient.setQueryData(profileKeys.detail(userName), data, { updatedAt })
  logProfileHydratorPerf('setQueryData', setQueryStartedAt)
  const snapshotStartedAt = PERF_TRACE ? Date.now() : 0
  const snapshotPromise = putSnapshot('profileSelf', snapshotKeys.profileSelf(userId), data, {
    timestamp: updatedAt,
  })
  if (PERF_TRACE) {
    snapshotPromise
      .then(() => {
        logProfileHydratorPerf('putSnapshot', snapshotStartedAt)
      })
      .catch((error) => {
        console.warn('[profile][hydrator] putSnapshot failed', error)
        logProfileHydratorPerf('putSnapshot.error', snapshotStartedAt)
      })
  }
  await snapshotPromise
  logProfileHydratorPerf('total', totalStartedAt)
}

const hydrateWantToMeetList = async (userId: string) => {
  if (!userId) return
  const key = wantToMeetKeys.list(userId)
  if (isQueryFresh(key, 30_000)) {
    return
  }

  const data = await fetchWantToMeet(userId)
  const updatedAt = Date.now()
  queryClient.setQueryData(key, data, { updatedAt })
  await putSnapshot('wantToMeetList', snapshotKeys.wantToMeetList(userId), data, {
    timestamp: updatedAt,
  })
}

const hydrateMessagesFirstPage = async (userId: string) => {
  if (!userId) return
  const key = messagingKeys.conversations(userId)
  if (isQueryFresh(key, 30_000)) {
    return
  }

  const page = await fetchConversationsPage(userId, 1, { hydrate: false })
  const updatedAt = Date.now()
  const infinite: InfiniteData<ConversationsPage> = {
    pageParams: [1],
    pages: [page],
  }

  queryClient.setQueryData(key, infinite, { updatedAt })
  await putSnapshot('messagesThreadsFirstPage', snapshotKeys.messagesThreadsFirstPage(userId), page, {
    timestamp: updatedAt,
  })
}

export async function preloadInitial() {
  clearTimingSamples()
  await new Promise<void>((resolve) => {
    const interactionCallback = () => resolve()
    ;(interactionCallback as any).__interactionLabel = 'preloadInitial:awaitInteractions'
    InteractionManager.runAfterInteractions(interactionCallback)
  })

  const { user } = useAppStore.getState()
  const userId = user?.id
  const userName = user?.userName

  enqueueHydratorJob({
    key: `directory:firstPage:${DEFAULT_COMMUNITY}`,
    label: 'hydrate:directory:firstPage',
    priority: 10,
    run: () => withTiming('hydrate:directory:firstPage', () => hydrateDirectoryFirstPage(DEFAULT_COMMUNITY)),
  })

  if (userId && userName) {
    enqueueHydratorJob({
      key: `profile:self:${userId}`,
      label: 'hydrate:profile:self',
      priority: 10,
      run: () => withTiming('hydrate:profile:self', () => hydrateProfileSelf(userId, userName)),
    })

    enqueueHydratorJob({
      key: `wantToMeet:list:${userId}`,
      label: 'hydrate:wantToMeet',
      priority: 5,
      run: () => withTiming('hydrate:wantToMeet', () => hydrateWantToMeetList(userId)),
    })

    enqueueHydratorJob({
      key: `messages:threads:firstPage:${userId}`,
      label: 'hydrate:messages:firstPage',
      priority: 5,
      run: () => withTiming('hydrate:messages:firstPage', () => hydrateMessagesFirstPage(userId)),
    })
  }

  setTimeout(() => {
    void prefetchInterestSummary().catch((error) => {
      console.warn('[preload] interest summary failed', error)
    })
  }, 1500)

  if (__DEV__) {
    setTimeout(() => {
      const timings = getTimingReport()
      if (timings.length) {
        console.log('Boot timings', timings.map(({ label, duration }) => ({ label, duration })))
      }
      const idleStats = getIdleQueueStats()
      console.log('Post-boot idleQueue', idleStats)
    }, 2200)
  }
}

export function startRealtime() {
  if (realtimeStarted) return
  realtimeStarted = true

  const ensureAuthSubscriptions = () => {
    const interactionCallback = () => {
      const currentUserId = useAppStore.getState().user?.id
      if (!currentUserId) {
        queryClient.removeQueries({ queryKey: wantToMeetKeys.all })
        queryClient.removeQueries({ queryKey: messagingKeys.root })
        return
      }

      queryClient.invalidateQueries({ queryKey: wantToMeetKeys.list(currentUserId) })
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(currentUserId) })
    }
    ;(interactionCallback as any).__interactionLabel = 'startRealtime:ensureAuthSubscriptions'
    InteractionManager.runAfterInteractions(interactionCallback)
  }

  ensureAuthSubscriptions()

  if (!authSubscription) {
    authSubscription = pocketbase.authStore.onChange(() => {
      ensureAuthSubscriptions()
    })
  }
}
