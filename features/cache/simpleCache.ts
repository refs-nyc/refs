import AsyncStorage from '@react-native-async-storage/async-storage'

// Simple cache with fixed TTLs
const CACHE_TTLS = {
  profile: 15 * 60 * 1000,        // 15 minutes
  grid_items: 3 * 60 * 1000,      // 3 minutes
  backlog_items: 3 * 60 * 1000,   // 3 minutes
  feed_items: 8 * 60 * 1000,      // 8 minutes
  directory_users: 10 * 60 * 1000, // 10 minutes
} as const

type CacheKey = keyof typeof CACHE_TTLS

interface CacheEntry<T> {
  data: T
  expires: number
}

class SimpleCache {
  private static instance: SimpleCache
  private cachePrefix = 'simple_cache_'

  static getInstance(): SimpleCache {
    if (!SimpleCache.instance) {
      SimpleCache.instance = new SimpleCache()
    }
    return SimpleCache.instance
  }

  private getKey(key: string, userId?: string): string {
    return userId ? `${this.cachePrefix}${key}_${userId}` : `${this.cachePrefix}${key}`
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
      console.log(`💾 Cache set: ${cacheKey}`)
    } catch (error) {
      console.warn('Cache write failed:', error)
      // Don't throw - cache failures shouldn't break the app
    }
  }

  // Clear cache for a user (when data changes)
  async clearUser(userId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const userKeys = keys.filter(key => key.includes(`_${userId}`))
      await AsyncStorage.multiRemove(userKeys)
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
