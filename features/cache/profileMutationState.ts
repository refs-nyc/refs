const TOMBSTONE_TTL_MS = 10_000

let mutationDepth = 0

const deletedTombstones = new Map<string, number>()

export const beginProfileMutation = () => {
  mutationDepth += 1
}

export const endProfileMutation = () => {
  mutationDepth = Math.max(0, mutationDepth - 1)
}

export const resetProfileMutationState = () => {
  mutationDepth = 0
  deletedTombstones.clear()
}

export const isProfileMutationInFlight = (): boolean => mutationDepth > 0

export const recordDeletedTombstone = (itemId: string) => {
  if (!itemId) return
  deletedTombstones.set(itemId, Date.now() + TOMBSTONE_TTL_MS)
}

export const shouldIgnoreRealtimeItem = (itemId: string): boolean => {
  if (!itemId) return false
  const expiresAt = deletedTombstones.get(itemId)
  if (!expiresAt) return false
  if (Date.now() > expiresAt) {
    deletedTombstones.delete(itemId)
    return false
  }
  return true
}

export const pruneExpiredTombstones = () => {
  const now = Date.now()
  for (const [id, expiresAt] of deletedTombstones.entries()) {
    if (expiresAt <= now) {
      deletedTombstones.delete(id)
    }
  }
}
