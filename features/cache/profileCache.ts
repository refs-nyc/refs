import { simpleCache } from '@/features/cache/simpleCache'
import type { ProfileData } from '@/features/queries/profile'
import type { ExpandedItem, Profile } from '@/features/types'
import { compactGridItem } from '@/features/stores/itemFormatters'
import {
  writeCompactProfileSnapshot,
  readCompactProfileSnapshot,
  compactSnapshotToProfileData,
} from '@/features/cache/compactProfileSnapshot'

export type ProfileCacheEntry = ProfileData & { timestamp: number }

const cacheByUserId = new Map<string, ProfileCacheEntry>()
const userNameToUserId = new Map<string, string>()

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
  return entry
}

const ensureProfile = (profile?: Profile, fallback?: Profile): Profile | undefined => {
  if (profile) return profile
  if (fallback) return fallback
  return undefined
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
  if (resolvedProfile) {
    updateProfileCacheEntry(userId, userName, () => ({
      profile: resolvedProfile,
      gridItems,
      backlogItems: backlogItems ?? existing?.backlogItems ?? [],
    }))
  }

  await simpleCache.set('grid_items', gridItems.map(compactGridItem), userId)
  rememberUserMapping(userId, userName)
  await writeCompactProfileSnapshot({
    userId,
    userName,
    profile: resolvedProfile ?? existing?.profile ?? null,
    gridItems,
    backlogItems: backlogItems ?? existing?.backlogItems ?? [],
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
  if (resolvedProfile) {
    updateProfileCacheEntry(userId, userName, () => ({
      profile: resolvedProfile,
      gridItems: gridItems ?? existing?.gridItems ?? [],
      backlogItems,
    }))
  }

  await simpleCache.set('backlog_items', backlogItems.map(compactGridItem), userId)
  rememberUserMapping(userId, userName)
  await writeCompactProfileSnapshot({
    userId,
    userName,
    profile: resolvedProfile ?? existing?.profile ?? null,
    gridItems: gridItems ?? existing?.gridItems ?? [],
    backlogItems,
  })
}

export const persistProfileSnapshot = async (
  userId: string,
  userName: string | undefined,
  data: ProfileData
): Promise<void> => {
  upsertProfileCacheEntry(userId, userName, data)
  await Promise.all([
    simpleCache.set('grid_items', data.gridItems.map(compactGridItem), userId),
    simpleCache.set('backlog_items', data.backlogItems.map(compactGridItem), userId),
    writeCompactProfileSnapshot({
      userId,
      userName,
      profile: data.profile,
      gridItems: data.gridItems,
      backlogItems: data.backlogItems,
    }),
  ])
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
