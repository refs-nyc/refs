import AsyncStorage from '@react-native-async-storage/async-storage'

// Simple cache with fixed TTLs
const CACHE_TTLS = {
  profile: 30 * 60 * 1000,        // 30 minutes
  grid_items: 15 * 60 * 1000,     // 15 minutes
  grid_items_preview: 15 * 60 * 1000,
  backlog_items: 15 * 60 * 1000,  // 15 minutes
  feed_items: 15 * 60 * 1000,     // 15 minutes
  directory_users: 15 * 60 * 1000, // 15 minutes
  conversations: 10 * 60 * 1000,   // 10 minutes
  conversation_memberships: 10 * 60 * 1000, // 10 minutes
  conversation_previews: 10 * 60 * 1000, // 10 minutes
  saves: 20 * 60 * 1000,          // 20 minutes
} as const

type CacheKey = keyof typeof CACHE_TTLS

interface CacheEntry<T> {
  data: T
  expires: number
}

export const GRID_PREVIEW_LIMIT = 16

class SimpleCache {
  private static instance: SimpleCache
  private cachePrefix = 'simple_cache_'
  private userKeyIndex = new Map<string, Set<string>>()

  static getInstance(): SimpleCache {
    if (!SimpleCache.instance) {
      SimpleCache.instance = new SimpleCache()
    }
    return SimpleCache.instance
  }

  private getKey(key: string, userId?: string): string {
    return userId ? `${this.cachePrefix}${key}_${userId}` : `${this.cachePrefix}${key}`
  }

  private trackUserKey(userId: string, cacheKey: string) {
    const existing = this.userKeyIndex.get(userId)
    if (existing) {
      existing.add(cacheKey)
    } else {
      this.userKeyIndex.set(userId, new Set([cacheKey]))
    }
  }

  private untrackUserKey(userId: string, cacheKey: string) {
    const existing = this.userKeyIndex.get(userId)
    if (!existing) return
    existing.delete(cacheKey)
    if (existing.size === 0) {
      this.userKeyIndex.delete(userId)
    }
  }

  // Read from cache (safe operation)
  async get<T>(key: CacheKey, userId?: string): Promise<T | null> {
    try {
      const cacheKey = this.getKey(key, userId)
      const cached = await AsyncStorage.getItem(cacheKey)
      
      if (!cached) {
        return null
      }

      const entry: CacheEntry<T> = JSON.parse(cached)
      
      // Check if expired
      if (Date.now() > entry.expires) {
        await AsyncStorage.removeItem(cacheKey)
        if (userId) {
          this.untrackUserKey(userId, cacheKey)
        }
        return null
      }

      console.log(`📖 Cache hit: ${cacheKey}`)
      return entry.data
    } catch (error) {
      console.warn('Cache read failed:', error)
      return null
    }
  }

  // Write to cache (only after successful operations)
  async set<T>(key: CacheKey, data: T, userId?: string): Promise<void> {
    try {
      const cacheKey = this.getKey(key, userId)
      const entry: CacheEntry<T> = {
        data,
        expires: Date.now() + CACHE_TTLS[key]
      }
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry))
      if (userId) {
        this.trackUserKey(userId, cacheKey)
      }
      console.log(`💾 Cache set: ${cacheKey}`)

      if (key === 'grid_items' && Array.isArray(data) && userId) {
        const preview = (data as unknown[]).slice(0, GRID_PREVIEW_LIMIT)
        const previewKey = this.getKey('grid_items_preview', userId)
        const previewEntry: CacheEntry<unknown[]> = {
          data: preview,
          expires: Date.now() + CACHE_TTLS.grid_items_preview,
        }
        await AsyncStorage.setItem(previewKey, JSON.stringify(previewEntry))
        this.trackUserKey(userId, previewKey)
        console.log(`💾 Cache set: ${previewKey}`)
      }
    } catch (error) {
      console.warn('Cache write failed:', error)
      // Don't throw - cache failures shouldn't break the app
    }
  }

  // Clear cache for a user (when data changes)
  async clearUser(userId: string): Promise<void> {
    try {
      const indexedKeys = Array.from(this.userKeyIndex.get(userId) ?? [])
      if (indexedKeys.length > 0) {
        await AsyncStorage.multiRemove(indexedKeys)
      } else {
        const keys = await AsyncStorage.getAllKeys()
        const filtered = keys.filter((key) => key.includes(`_${userId}`))
        if (filtered.length) {
          await AsyncStorage.multiRemove(filtered)
        }
      }
      this.userKeyIndex.delete(userId)
      console.log(`🗑️ Cache cleared for user: ${userId}`)
    } catch (error) {
      console.warn('Cache clear failed:', error)
    }
  }

  // Get cache stats for debugging
  async getStats(): Promise<{ totalEntries: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix))
      return { totalEntries: cacheKeys.length }
    } catch (error) {
      console.warn('Cache stats failed:', error)
      return { totalEntries: 0 }
    }
  }
}

export const simpleCache = SimpleCache.getInstance()
export { CACHE_TTLS }
export type { CacheKey }
