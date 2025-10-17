import AsyncStorage from '@react-native-async-storage/async-storage'

import type { ProfileData } from '@/features/queries/profile'
import type { ExpandedItem, Profile } from '@/features/types'
import { Collections } from '@/features/pocketbase/pocketbase-types'

const SNAPSHOT_VERSION = 1
const SNAPSHOT_EPOCH = process.env.EXPO_PUBLIC_CACHE_EPOCH ?? '1'
const STORAGE_PREFIX = `compact_profile_snapshot_v${SNAPSHOT_EPOCH}`
const MAX_BYTES = 45 * 1024 // stay below AsyncStorage 50KB limit

type CompactProfile = {
  id: string
  userName?: string
  firstName?: string
  lastName?: string
  name?: string
  location?: string
  image?: string
  avatar_url?: string
  updated?: string
}

type CompactItem = {
  id: string
  ref: string
  title?: string
  image?: string
  url?: string
  text?: string
  list?: boolean
  backlog?: boolean
  order?: number
  promptContext?: string
  updatedAt: number
}

export type CompactProfileSnapshot = {
  version: number
  updatedAt: number
  userId: string
  userName?: string
  profile?: CompactProfile
  grid: CompactItem[]
  backlog: CompactItem[]
}

const compactItemFromExpanded = (item: ExpandedItem): CompactItem => {
  const ref = item.expand?.ref
  return {
    id: item.id,
    ref: item.ref,
    title: ref?.title ?? item.expand?.ref?.title ?? item.text ?? '',
    image: item.image || ref?.image || '',
    url: item.url || ref?.url || '',
    text: item.text || '',
    list: item.list || false,
    backlog: item.backlog || false,
    order: item.order ?? 0,
    promptContext: item.promptContext || '',
    updatedAt: item.updated ? Date.parse(item.updated) || Date.now() : Date.now(),
  }
}

const expandedFromCompact = (item: CompactItem): ExpandedItem => {
  const updatedIso = new Date(item.updatedAt || Date.now()).toISOString()
  return {
    id: item.id,
    collectionId: Collections.Items,
    collectionName: Collections.Items,
    ref: item.ref,
    image: item.image ?? '',
    url: item.url ?? '',
    text: item.text ?? '',
    list: Boolean(item.list),
    backlog: Boolean(item.backlog),
    order: item.order ?? 0,
    promptContext: item.promptContext ?? '',
    created: updatedIso,
    updated: updatedIso,
    expand: {
      ref: {
        id: item.ref,
        title: item.title ?? '',
        image: item.image ?? '',
        url: item.url ?? '',
        meta: '{}',
        creator: '',
        created: updatedIso,
        updated: updatedIso,
      },
      creator: null as any,
      items_via_parent: [] as any,
    },
  }
}

const toCompactProfile = (profile?: Profile | null): CompactProfile | undefined => {
  if (!profile) return undefined
  return {
    id: profile.id,
    userName: profile.userName,
    firstName: profile.firstName,
    lastName: profile.lastName,
    name: profile.name,
    location: profile.location,
    image: profile.image,
    avatar_url: (profile as any)?.avatar_url,
    updated: profile.updated,
  }
}

const fromCompactProfile = (profile?: CompactProfile): Profile | undefined => {
  if (!profile) return undefined
  return {
    id: profile.id,
    userName: profile.userName ?? '',
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    name: profile.name ?? '',
    location: profile.location ?? '',
    image: profile.image ?? '',
    avatar_url: profile.avatar_url ?? '',
    updated: profile.updated ?? new Date().toISOString(),
    emailVisibility: false,
    email: '',
    verified: false,
  } as Profile
}

const storageKey = (userId: string) => `${STORAGE_PREFIX}:${SNAPSHOT_VERSION}:${userId}`

export async function writeCompactProfileSnapshot(options: {
  userId: string
  userName?: string
  profile?: Profile | null
  gridItems: ExpandedItem[]
  backlogItems: ExpandedItem[]
  updatedAt?: number
}): Promise<void> {
  const { userId, userName, profile, gridItems, backlogItems, updatedAt } = options
  const compact: CompactProfileSnapshot = {
    version: SNAPSHOT_VERSION,
    updatedAt:
      updatedAt ??
      Math.max(
        Date.now(),
        ...gridItems.map((item) => Date.parse(item.updated ?? '') || 0),
        ...backlogItems.map((item) => Date.parse(item.updated ?? '') || 0)
      ),
    userId,
    userName,
    profile: toCompactProfile(profile),
    grid: gridItems.map(compactItemFromExpanded),
    backlog: backlogItems.map(compactItemFromExpanded),
  }

  const serialized = JSON.stringify(compact)

  if (serialized.length > MAX_BYTES) {
    if (__DEV__) {
      console.warn('[compact-profile] snapshot oversized', {
        userId,
        size: serialized.length,
      })
    }
    return
  }

  try {
    await AsyncStorage.setItem(storageKey(userId), serialized)
    if (__DEV__) {
      const sizeKb = Math.round((serialized.length / 1024) * 10) / 10
      console.log('[compact-profile] snapshot saved', { userId, sizeKb })
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[compact-profile] write failed', error)
    }
  }
}

export async function readCompactProfileSnapshot(
  userId: string
): Promise<CompactProfileSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId))
    if (!raw) return null
    const snapshot = JSON.parse(raw) as CompactProfileSnapshot
    if (snapshot.version !== SNAPSHOT_VERSION) {
      return null
    }
    return snapshot
  } catch (error) {
    if (__DEV__) {
      console.warn('[compact-profile] read failed', error)
    }
    return null
  }
}

export function compactSnapshotToProfileData(
  snapshot: CompactProfileSnapshot
): ProfileData | null {
  const resolvedProfile =
    fromCompactProfile(snapshot.profile) ??
    ({
      id: snapshot.userId,
      userName: snapshot.profile?.userName ?? snapshot.userName ?? '',
      firstName: snapshot.profile?.firstName ?? '',
      lastName: snapshot.profile?.lastName ?? '',
      name: snapshot.profile?.name ?? '',
      location: snapshot.profile?.location ?? '',
      image: snapshot.profile?.image ?? '',
      avatar_url: snapshot.profile?.avatar_url ?? '',
      updated: new Date(snapshot.updatedAt).toISOString(),
      email: '',
      emailVisibility: false,
      verified: false,
    } as Profile)

  if (!resolvedProfile.userName) {
    return null
  }
  return {
    profile: resolvedProfile,
    gridItems: snapshot.grid.map(expandedFromCompact),
    backlogItems: snapshot.backlog.map(expandedFromCompact),
  }
}

export async function clearCompactProfileSnapshot(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId))
  } catch (error) {
    if (__DEV__) {
      console.warn('[compact-profile] clear failed', error)
    }
  }
}
