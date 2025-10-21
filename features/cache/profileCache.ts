import { simpleCache } from '@/features/cache/simpleCache'
import type { ProfileData } from '@/features/queries/profile'
import type { ExpandedItem, Profile } from '@/features/types'
import { compactGridItem } from '@/features/stores/itemFormatters'
import {
  writeCompactProfileSnapshot,
  readCompactProfileSnapshot,
  compactSnapshotToProfileData,
} from '@/features/cache/compactProfileSnapshot'
import { putSnapshot, snapshotKeys } from '@/features/cache/snapshotStore'

export type ProfileCacheEntry = ProfileData & { timestamp: number }

const cacheByUserId = new Map<string, ProfileCacheEntry>()
const userNameToUserId = new Map<string, string>()
const snapshotUpdatedAtByUserId = new Map<string, number>()

const rememberUserMapping = (userId: string, userName?: string) => {
  if (userName) {
    userNameToUserId.set(userName, userId)
  }
}

export const linkUserNameToUserId = (userName: string, userId: string) => {
  rememberUserMapping(userId, userName)
}

export const getProfileCacheEntryByUserId = (userId: string): ProfileCacheEntry | undefined =>
  cacheByUserId.get(userId)

export const getProfileCacheEntryByUserName = (userName: string): ProfileCacheEntry | undefined => {
  const userId = userNameToUserId.get(userName)
  if (!userId) return undefined
  return cacheByUserId.get(userId)
}

export const getSnapshotUpdatedAt = (userId: string): number | undefined =>
  snapshotUpdatedAtByUserId.get(userId)

export const upsertProfileCacheEntry = (
  userId: string,
  userName: string | undefined,
  data: ProfileData,
  timestamp = Date.now()
): ProfileCacheEntry => {
  rememberUserMapping(userId, userName)
  const entry: ProfileCacheEntry = {
    ...data,
    timestamp,
  }
  cacheByUserId.set(userId, entry)
  snapshotUpdatedAtByUserId.set(userId, timestamp)
  return entry
}

export const updateProfileCacheEntry = (
  userId: string,
  userName: string | undefined,
  updater: (entry: ProfileCacheEntry | undefined) => ProfileData | null | undefined
): ProfileCacheEntry | undefined => {
  rememberUserMapping(userId, userName)
  const existing = cacheByUserId.get(userId)
  const next = updater(existing)
  if (!next) {
    cacheByUserId.delete(userId)
    return undefined
  }
  const entry: ProfileCacheEntry = {
    ...next,
    timestamp: Date.now(),
  }
  cacheByUserId.set(userId, entry)
  snapshotUpdatedAtByUserId.set(userId, entry.timestamp)
  return entry
}

const ensureProfile = (profile?: Profile, fallback?: Profile): Profile | undefined => {
  if (profile) return profile
  if (fallback) return fallback
  return undefined
}

export type ProfileSnapshotPayload = {
  userId: string
  userName?: string
  profile: Profile
  gridItems: ExpandedItem[]
  backlogItems: ExpandedItem[]
  updatedAt?: number
}

const MIN_WRITE_INTERVAL_MS = 0

export const writeProfileSnapshot = async ({
  userId,
  userName,
  profile,
  gridItems,
  backlogItems,
  updatedAt,
}: ProfileSnapshotPayload): Promise<void> => {
  if (!userId || userId === 'unknown') {
    if (__DEV__) {
      console.warn('[profile][snapshot] skipped write (invalid userId)', { userId })
    }
    return
  }

  const resolvedProfile = ensureProfile(profile)
  if (!resolvedProfile) {
    if (__DEV__) {
      console.warn('[profile][snapshot] skipped write (missing profile)', { userId })
    }
    return
  }

  const timestamp = updatedAt ?? Date.now()
  const lastWrite = snapshotUpdatedAtByUserId.get(userId)
  if (typeof lastWrite === 'number' && timestamp + MIN_WRITE_INTERVAL_MS < lastWrite) {
    if (__DEV__) {
      console.warn('[profile][snapshot] skipped write (stale payload)', {
        userId,
        incoming: timestamp,
        existing: lastWrite,
      })
    }
    return
  }

  const entry: ProfileData = {
    profile: resolvedProfile,
    gridItems,
    backlogItems,
  }

  upsertProfileCacheEntry(userId, userName ?? resolvedProfile.userName, entry, timestamp)

  const compactedGrid = gridItems.map(compactGridItem)
  const compactedBacklog = backlogItems.map(compactGridItem)

  await Promise.all([
    simpleCache.set('grid_items', compactedGrid, userId),
    simpleCache.set('backlog_items', compactedBacklog, userId),
    writeCompactProfileSnapshot({
      userId,
      userName: userName ?? resolvedProfile.userName,
      profile: resolvedProfile,
      gridItems,
      backlogItems,
      updatedAt: timestamp,
    }),
    putSnapshot('profileSelf', snapshotKeys.profileSelf(userId), entry, {
      timestamp,
    }),
  ])

  console.log('[profile][snapshot] write', { userId, size: gridItems.length })
}

export const persistGridSnapshot = async ({
  userId,
  userName,
  gridItems,
  profile,
  backlogItems,
}: {
  userId: string
  userName?: string
  gridItems: ExpandedItem[]
  profile?: Profile | null
  backlogItems?: ExpandedItem[]
}): Promise<void> => {
  const existing = cacheByUserId.get(userId)
  const resolvedProfile = ensureProfile(profile ?? undefined, existing?.profile)
  if (!resolvedProfile) return

  const nextBacklog = backlogItems ?? existing?.backlogItems ?? []
  await writeProfileSnapshot({
    userId,
    userName,
    profile: resolvedProfile,
    gridItems,
    backlogItems: nextBacklog,
    updatedAt: Date.now(),
  })
}

export const persistBacklogSnapshot = async ({
  userId,
  userName,
  backlogItems,
  profile,
  gridItems,
}: {
  userId: string
  userName?: string
  backlogItems: ExpandedItem[]
  profile?: Profile | null
  gridItems?: ExpandedItem[]
}): Promise<void> => {
  const existing = cacheByUserId.get(userId)
  const resolvedProfile = ensureProfile(profile ?? undefined, existing?.profile)
  if (!resolvedProfile) return

  const nextGrid = gridItems ?? existing?.gridItems ?? []
  await writeProfileSnapshot({
    userId,
    userName,
    profile: resolvedProfile,
    gridItems: nextGrid,
    backlogItems,
    updatedAt: Date.now(),
  })
}

export const persistProfileSnapshot = async (
  userId: string,
  userName: string | undefined,
  data: ProfileData
): Promise<void> => {
  await writeProfileSnapshot({
    userId,
    userName,
    profile: data.profile,
    gridItems: data.gridItems,
    backlogItems: data.backlogItems,
    updatedAt: Date.now(),
  })
}

export const getProfileSnapshotByUserName = (userName: string): ProfileData | undefined => {
  const entry = getProfileCacheEntryByUserName(userName)
  if (!entry) return undefined
  return {
    profile: entry.profile,
    gridItems: entry.gridItems,
    backlogItems: entry.backlogItems,
  }
}

export const loadProfileSnapshotFromStorage = async ({
  userId,
  userName,
}: {
  userId: string
  userName?: string
}): Promise<ProfileData | null> => {
  try {
    const snapshot = await readCompactProfileSnapshot(userId)
    if (!snapshot) return null
    const data = compactSnapshotToProfileData(snapshot)
    if (!data) return null
    upsertProfileCacheEntry(userId, userName ?? snapshot.userName, data, snapshot.updatedAt)
    return data
  } catch (error) {
    if (__DEV__) {
      console.warn('[profileCache] loadProfileSnapshotFromStorage failed', error)
    }
    return null
  }
}
