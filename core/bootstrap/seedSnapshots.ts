import type { InfiniteData } from '@tanstack/react-query'

import { queryClient } from '@/core/queryClient'
import {
  getSnapshots,
  snapshotKeys,
  SnapshotKey,
  DirectorySnapshot,
  ProfileSnapshot,
  WantToMeetSnapshot,
  MessagesSnapshot,
  migrateSnapshots,
} from '@/features/cache/snapshotStore'
import { directoryKeys, type DirectoryPage } from '@/features/queries/directory'
import {
  profileKeys,
  type ProfileData,
  extractProfileHeader,
  persistProfileHeaderSnapshot,
} from '@/features/queries/profile'
import { wantToMeetKeys } from '@/features/queries/wantToMeet'
import { messagingKeys, type ConversationsPage } from '@/features/queries/messaging'
import { isProfileMutationInFlight } from '@/features/cache/profileMutationState'

export const DEFAULT_COMMUNITY = 'edge-patagonia'
const PERF_TRACE = process.env.EXPO_PUBLIC_PERF_HARNESS === '1'

type SeedContext = {
  userId?: string | null
  userName?: string | null
  communityId?: string
}

type SnapshotMapEntry = {
  key: SnapshotKey
  descriptor: ReturnType<(typeof snapshotKeys)[SnapshotKey]>
}

export async function seedBootSnapshots(context: SeedContext = {}): Promise<void> {
  const communityId = context.communityId || DEFAULT_COMMUNITY
  const userId = context.userId ?? undefined
  const userName = context.userName ?? undefined

  await migrateSnapshots()

  const requests: SnapshotMapEntry[] = [
    { key: 'directoryFirstPage', descriptor: snapshotKeys.directoryFirstPage(communityId) },
  ]

  if (userId) {
    requests.push({ key: 'wantToMeetList', descriptor: snapshotKeys.wantToMeetList(userId) })
    requests.push({ key: 'messagesThreadsFirstPage', descriptor: snapshotKeys.messagesThreadsFirstPage(userId) })
    requests.push({ key: 'profileSelf', descriptor: snapshotKeys.profileSelf(userId) })
  }

  if (requests.length === 0) {
    return
  }

  const snapshotsStartedAt = PERF_TRACE ? Date.now() : 0
  const snapshotMap = await getSnapshots(requests)
  if (PERF_TRACE) {
    const duration = Date.now() - snapshotsStartedAt
    console.log('[profile][perf] seedSnapshots.getSnapshots', { count: requests.length, duration })
  }

  const directorySnapshot = snapshotMap.get('directoryFirstPage') as
    | { data: DirectorySnapshot; timestamp: number }
    | undefined
  if (directorySnapshot?.data) {
    const infiniteData: InfiniteData<DirectoryPage> = {
      pageParams: [1],
      pages: [directorySnapshot.data],
    }
    queryClient.setQueryData(directoryKeys.all, infiniteData, { updatedAt: directorySnapshot.timestamp })
  }

  if (userId && userName) {
    const applyStartedAt = PERF_TRACE ? Date.now() : 0
    const profileSnapshot = snapshotMap.get('profileSelf') as
      | { data: ProfileSnapshot; timestamp: number }
      | undefined
    if (profileSnapshot?.data) {
      queryClient.setQueryData(profileKeys.grid(userId), profileSnapshot.data, {
        updatedAt: profileSnapshot.timestamp,
      })
      const header = extractProfileHeader(profileSnapshot.data.profile)
      queryClient.setQueryData(profileKeys.header(userName), header, {
        updatedAt: profileSnapshot.timestamp,
      })
      if (userId && !isProfileMutationInFlight()) {
        await persistProfileHeaderSnapshot(userId, header)
      }
      if (PERF_TRACE) {
        const payloadSize = JSON.stringify(profileSnapshot.data).length
        const duration = Date.now() - applyStartedAt
        console.log('[profile][perf] seedSnapshots.applyProfileSnapshot', {
          duration,
          payloadSize,
          grid: profileSnapshot.data.gridItems.length,
          backlog: profileSnapshot.data.backlogItems.length,
        })
      }
    }
  }

  if (userId) {
    const wantSnapshot = snapshotMap.get('wantToMeetList') as
      | { data: WantToMeetSnapshot; timestamp: number }
      | undefined
    if (wantSnapshot?.data) {
      queryClient.setQueryData(wantToMeetKeys.list(userId), wantSnapshot.data, {
        updatedAt: wantSnapshot.timestamp,
      })
    }

    const messagesSnapshot = snapshotMap.get('messagesThreadsFirstPage') as
      | { data: MessagesSnapshot; timestamp: number }
      | undefined
    if (messagesSnapshot?.data) {
      const infinite: InfiniteData<ConversationsPage> = {
        pageParams: [1],
        pages: [messagesSnapshot.data],
      }
      queryClient.setQueryData(messagingKeys.conversations(userId), infinite, {
        updatedAt: messagesSnapshot.timestamp,
      })
    }
  }
}
