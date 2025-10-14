import AsyncStorage from '@react-native-async-storage/async-storage'

import type { DirectoryPage } from '@/features/queries/directory'
import type { ProfileData, ProfileHeaderSnapshot } from '@/features/queries/profile'
import type { ExpandedSave } from '@/features/types'
import type {
  ConversationMessagesPage,
  ConversationsPage,
} from '@/features/queries/messaging'

const SNAPSHOT_PREFIX = 'snapshot'
const SNAPSHOT_VERSION = 2
const CHUNK_THRESHOLD_BYTES = 48 * 1024 // ~48KB guardrail per chunk
const CHUNK_META_PREFIX = '__chunk__:'
const MAX_SNAPSHOT_BYTES = 80 * 1024
const MAX_SNAPSHOT_AGE_MS = 14 * 24 * 60 * 60 * 1000

type SnapshotEnvelope<T> = {
  version: number
  timestamp: number
  etag?: string
  data: T
}

export type SnapshotReadResult<T> = SnapshotEnvelope<T> & { key: string }

type SnapshotDescriptor = {
  storageKey: string
}

export type DirectorySnapshot = DirectoryPage

export type ProfileSnapshot = ProfileData
export type ProfileHeader = ProfileHeaderSnapshot

export type WantToMeetSnapshot = ExpandedSave[]

export type MessagesSnapshot = ConversationsPage

export type ChatSnapshot = ConversationMessagesPage

export const snapshotKeys = {
  directoryFirstPage: (community: string) =>
    buildDescriptor(`directory:firstPage:${community}`),
  profileSelf: (userId: string) => buildDescriptor(`profile:self:${userId}`),
  profileSelfHeader: (userId: string) => buildDescriptor(`profile:self:header:${userId}`),
  wantToMeetList: (userId: string) => buildDescriptor(`wantToMeet:list:${userId}`),
  messagesThreadsFirstPage: (userId: string) =>
    buildDescriptor(`messages:threads:firstPage:${userId}`),
  chatThreadFirstPage: (conversationId: string) =>
    buildDescriptor(`chat:thread:firstPage:${conversationId}`),
}

export type SnapshotKey = keyof typeof snapshotKeys

type SnapshotContentMap = {
  directoryFirstPage: DirectorySnapshot
  profileSelf: ProfileSnapshot
  profileSelfHeader: ProfileHeader
  wantToMeetList: WantToMeetSnapshot
  messagesThreadsFirstPage: MessagesSnapshot
  chatThreadFirstPage: ChatSnapshot
}

type SnapshotInput<K extends SnapshotKey> = SnapshotContentMap[K]

export async function getSnapshot<K extends SnapshotKey>(
  key: K,
  descriptor: ReturnType<(typeof snapshotKeys)[K]>
): Promise<SnapshotReadResult<SnapshotInput<K>> | null> {
  const storageKey = descriptor.storageKey
  const payload = await AsyncStorage.getItem(storageKey)
  if (!payload) return null

  if (payload.startsWith(CHUNK_META_PREFIX)) {
    const metaRaw = payload.slice(CHUNK_META_PREFIX.length)
    let meta: { chunkCount: number }
    try {
      meta = JSON.parse(metaRaw)
    } catch (error) {
      await safeRemoveWithChunks(storageKey)
      return null
    }
    if (!meta?.chunkCount || meta.chunkCount <= 0) {
      await safeRemoveWithChunks(storageKey)
      return null
    }
    const chunkKeys = chunkRange(storageKey, meta.chunkCount)
    const chunkPairs = await AsyncStorage.multiGet(chunkKeys)
    const joined = chunkPairs
      .map(([, value]) => value ?? '')
      .join('')
    if (!joined) {
      await safeRemoveWithChunks(storageKey)
      return null
    }
    const envelope = parseEnvelope<SnapshotInput<K>>(joined, storageKey)
    if (!envelope) {
      await safeRemoveWithChunks(storageKey)
    }
    return envelope
  }

  const envelope = parseEnvelope<SnapshotInput<K>>(payload, storageKey)
  if (!envelope) {
    await safeRemoveWithChunks(storageKey)
  }
  return envelope
}

type SnapshotRequest<K extends SnapshotKey = SnapshotKey> = {
  key: K
  descriptor: ReturnType<(typeof snapshotKeys)[K]>
}

export async function getSnapshots(
  descriptors: SnapshotRequest[]
): Promise<Map<SnapshotKey, SnapshotReadResult<unknown>>> {
  const result = new Map<SnapshotKey, SnapshotReadResult<unknown>>()
  const primaryKeys = descriptors.map(({ descriptor }) => descriptor.storageKey)

  if (!primaryKeys.length) {
    return result
  }

  const pairs = await AsyncStorage.multiGet(primaryKeys)
  const toFetchChunks: Array<{ index: number; chunkCount: number }> = []

  pairs.forEach(([storageKey, value], index) => {
    if (!value) return
    if (value.startsWith(CHUNK_META_PREFIX)) {
      try {
        const meta = JSON.parse(value.slice(CHUNK_META_PREFIX.length))
        if (meta?.chunkCount > 0) {
          toFetchChunks.push({ index, chunkCount: meta.chunkCount })
        }
      } catch {
        // noop; we'll clean later when parse fails
      }
    }
  })

  const chunkLookups: Array<Promise<string | null>> = []
  toFetchChunks.forEach(({ index, chunkCount }) => {
    const storageKey = primaryKeys[index]
    const chunkKeys = chunkRange(storageKey, chunkCount)
    chunkLookups.push(
      AsyncStorage.multiGet(chunkKeys).then((chunkPairs) =>
        chunkPairs.map(([, val]) => val ?? '').join('')
      )
    )
  })

  const chunkPayloads = await Promise.all(chunkLookups)

  let chunkCursor = 0

  for (let i = 0; i < descriptors.length; i += 1) {
    const { key, descriptor } = descriptors[i]
    const storageKey = descriptor.storageKey
    const raw = pairs[i]?.[1]
    if (!raw) continue

    let envelope: SnapshotReadResult<unknown> | null = null

    if (raw.startsWith(CHUNK_META_PREFIX)) {
      const payload = chunkPayloads[chunkCursor] ?? ''
      chunkCursor += 1
      if (!payload) {
        await safeRemoveWithChunks(storageKey)
        continue
      }
      envelope = parseEnvelope(payload, storageKey)
      if (!envelope) {
        await safeRemoveWithChunks(storageKey)
        continue
      }
    } else {
      envelope = parseEnvelope(raw, storageKey)
      if (!envelope) {
        await safeRemoveWithChunks(storageKey)
        continue
      }
    }

    result.set(key, envelope)
  }

  return result
}

export async function putSnapshot<K extends SnapshotKey>(
  key: K,
  descriptor: ReturnType<(typeof snapshotKeys)[K]>,
  data: SnapshotInput<K>,
  options: { etag?: string; timestamp?: number } = {}
): Promise<void> {
  const envelope: SnapshotEnvelope<SnapshotInput<K>> = {
    version: SNAPSHOT_VERSION,
    timestamp: options.timestamp ?? Date.now(),
    etag: options.etag,
    data,
  }

  const serialized = JSON.stringify(envelope)
  const storageKey = descriptor.storageKey

  if (serialized.length > MAX_SNAPSHOT_BYTES) {
    await safeRemoveWithChunks(storageKey)
    if (__DEV__) {
      console.warn('[snapshot] skipped putSnapshot (oversize)', {
        key: storageKey,
        size: serialized.length,
      })
    }
    return
  }

  if (serialized.length <= CHUNK_THRESHOLD_BYTES) {
    await AsyncStorage.setItem(storageKey, serialized)
    return
  }

  const chunks = chunkString(serialized, CHUNK_THRESHOLD_BYTES)
  const chunkEntries = chunks.map<[string, string]>((chunk, index) => [chunkKey(storageKey, index), chunk])
  const meta = JSON.stringify({ chunkCount: chunks.length })
  await AsyncStorage.multiSet([[storageKey, `${CHUNK_META_PREFIX}${meta}`], ...chunkEntries])
}

export async function removeSnapshot(descriptor: SnapshotDescriptor): Promise<void> {
  await safeRemoveWithChunks(descriptor.storageKey)
}

function buildDescriptor(storageKey: string): SnapshotDescriptor {
  return {
    storageKey: `${SNAPSHOT_PREFIX}:${SNAPSHOT_VERSION}:${storageKey}`,
  }
}

function chunkString(value: string, size: number): string[] {
  const result: string[] = []
  for (let index = 0; index < value.length; index += size) {
    result.push(value.slice(index, index + size))
  }
  return result
}

function chunkKey(base: string, index: number): string {
  return `${base}#${index}`
}

function chunkRange(base: string, count: number): string[] {
  const keys: string[] = []
  for (let index = 0; index < count; index += 1) {
    keys.push(chunkKey(base, index))
  }
  return keys
}

async function safeRemoveWithChunks(base: string) {
  const value = await AsyncStorage.getItem(base)
  if (value && value.startsWith(CHUNK_META_PREFIX)) {
    try {
      const meta = JSON.parse(value.slice(CHUNK_META_PREFIX.length))
      if (meta?.chunkCount > 0) {
        const keys = chunkRange(base, meta.chunkCount)
        await AsyncStorage.multiRemove(keys)
      }
    } catch {
      // ignore
    }
  }
  await AsyncStorage.removeItem(base)
}

function parseEnvelope<T>(raw: string, key: string): SnapshotReadResult<T> | null {
  if (!raw || raw.length > MAX_SNAPSHOT_BYTES) {
    return null
  }

  try {
    const envelope = JSON.parse(raw) as SnapshotEnvelope<T>
    if (typeof envelope !== 'object' || envelope === null) {
      return null
    }
    if (envelope.version !== SNAPSHOT_VERSION) {
      return null
    }
    if (typeof envelope.timestamp !== 'number') {
      return null
    }
    if (Date.now() - envelope.timestamp > MAX_SNAPSHOT_AGE_MS) {
      return null
    }
    return { ...envelope, key }
  } catch (error) {
    return null
  }
}

let snapshotMigrationRan = false

export async function migrateSnapshots(): Promise<void> {
  if (snapshotMigrationRan) return
  snapshotMigrationRan = true

  try {
    const keys = await AsyncStorage.getAllKeys()
    if (!keys.length) return

    const snapshotKeysToInspect = keys.filter(
      (key) => key.startsWith(`${SNAPSHOT_PREFIX}:`) && !key.includes('#')
    )

    const now = Date.now()

    for (const storageKey of snapshotKeysToInspect) {
      const value = await AsyncStorage.getItem(storageKey)
      if (!value) {
        continue
      }

      let payload = value
      if (payload.startsWith(CHUNK_META_PREFIX)) {
        const metaRaw = payload.slice(CHUNK_META_PREFIX.length)
        try {
          const meta = JSON.parse(metaRaw) as { chunkCount: number }
          if (!meta?.chunkCount || meta.chunkCount <= 0) {
            await safeRemoveWithChunks(storageKey)
            continue
          }
          const chunkKeys = chunkRange(storageKey, meta.chunkCount)
          const chunkPairs = await AsyncStorage.multiGet(chunkKeys)
          payload = chunkPairs
            .map(([, chunkValue]) => chunkValue ?? '')
            .join('')
          if (!payload) {
            await safeRemoveWithChunks(storageKey)
            continue
          }
        } catch (error) {
          await safeRemoveWithChunks(storageKey)
          continue
        }
      }

      if (payload.length > MAX_SNAPSHOT_BYTES) {
        await safeRemoveWithChunks(storageKey)
        continue
      }

      let envelope: SnapshotEnvelope<unknown> | null = null
      try {
        envelope = JSON.parse(payload) as SnapshotEnvelope<unknown>
      } catch (error) {
        await safeRemoveWithChunks(storageKey)
        continue
      }

      if (!envelope || typeof envelope !== 'object') {
        await safeRemoveWithChunks(storageKey)
        continue
      }

      if (envelope.version !== SNAPSHOT_VERSION) {
        await safeRemoveWithChunks(storageKey)
        continue
      }

      if (typeof envelope.timestamp !== 'number') {
        await safeRemoveWithChunks(storageKey)
        continue
      }

      if (now - envelope.timestamp > MAX_SNAPSHOT_AGE_MS) {
        await safeRemoveWithChunks(storageKey)
        continue
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[snapshot] migrateSnapshots failed', error)
    }
  }
}
