import AsyncStorage from '@react-native-async-storage/async-storage'
import { isIdleTaskContext } from '@/features/utils/idleQueue'

// Simple cache with fixed TTLs
const CACHE_TTLS = {
  profile: 15 * 60 * 1000,        // 15 minutes
  grid_items: 3 * 60 * 1000,      // 3 minutes
  backlog_items: 3 * 60 * 1000,   // 3 minutes
  feed_items: 8 * 60 * 1000,      // 8 minutes
  feed_entries: 10 * 60 * 1000,   // 10 minutes
  directory_users: 10 * 60 * 1000, // 10 minutes
  conversations: 5 * 60 * 1000,    // 5 minutes
  conversation_memberships: 5 * 60 * 1000, // 5 minutes
  conversation_previews: 3 * 60 * 1000, // 3 minutes
  saves: 10 * 60 * 1000,          // 10 minutes
} as const

type CacheKey = keyof typeof CACHE_TTLS

interface CacheEntry<T> {
  data: T
  expires: number
}

class SimpleCache {
  private static instance: SimpleCache
  private cachePrefix = 'simple_cache_'

  private writeQueue: Array<{ cacheKey: string; payload: string }> = []
  private writing = false
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  static getInstance(): SimpleCache {
    if (!SimpleCache.instance) {
      SimpleCache.instance = new SimpleCache()
    }
    return SimpleCache.instance
  }

  private getKey(key: string, userId?: string): string {
    return userId ? `${this.cachePrefix}${key}_${userId}` : `${this.cachePrefix}${key}`
  }

  private scheduleFlush() {
    if (this.flushTimer || this.writing || this.writeQueue.length === 0) {
      return
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      void this.flushQueue()
    }, FLUSH_INTERVAL_MS)
  }

  private async writeToStorage(cacheKey: string, payload: string) {
    const started = Date.now()
    await AsyncStorage.setItem(cacheKey, payload)
    if (__DEV__) {
      const duration = Date.now() - started
      const sizeKb = Math.round((payload.length / 1024) * 10) / 10
      console.log(`💾 Cache set: ${cacheKey} (${sizeKb} KB, ${duration} ms)`) // eslint-disable-line no-console
    }
  }

  private enqueueWrite(cacheKey: string, payload: string, options?: { priority?: 'high' }) {
    const existingIndex = this.writeQueue.findIndex((entry) => entry.cacheKey === cacheKey)
    if (existingIndex >= 0) {
      this.writeQueue.splice(existingIndex, 1)
    }

    if (options?.priority === 'high') {
      this.writeQueue.unshift({ cacheKey, payload })
    } else {
      this.writeQueue.push({ cacheKey, payload })
    }
  }

  private requestFlush({ immediate = false }: { immediate?: boolean } = {}) {
    if (this.writing || this.writeQueue.length === 0) {
      return
    }

    if (immediate) {
      void this.flushQueue()
      return
    }

    this.scheduleFlush()
  }

  private async flushQueue() {
    if (this.writing) return
    this.writing = true

    try {
      let processed = 0
      while (this.writeQueue.length && processed < FLUSH_BATCH_SIZE) {
        const { cacheKey, payload } = this.writeQueue.shift()!
        try {
          await this.writeToStorage(cacheKey, payload)
        } catch (error) {
          console.warn('Cache write failed:', error)
        }
        processed += 1
      }
    } finally {
      this.writing = false
      if (this.writeQueue.length) {
        this.scheduleFlush()
      }
    }
  }

  // Read from cache (safe operation)
  async get<T>(key: CacheKey, userId?: string): Promise<T | null> {
    const cacheKey = this.getKey(key, userId)

    try {
      const started = Date.now()
      const cached = await AsyncStorage.getItem(cacheKey)

      if (!cached) {
        return null
      }

      const entry: CacheEntry<T> = JSON.parse(cached)

      if (Date.now() > entry.expires) {
        await AsyncStorage.removeItem(cacheKey)
        return null
      }

      if (__DEV__) {
        const duration = Date.now() - started
        const sizeKb = Math.round((cached.length / 1024) * 10) / 10
        console.log(`📖 Cache hit: ${cacheKey} (${sizeKb} KB, ${duration} ms)`) // eslint-disable-line no-console
      }

      return entry.data
    } catch (error) {
      console.warn('Cache read failed:', { cacheKey, error })
      return null
    }
  }

  // Write to cache (only after successful operations)
  async set<T>(key: CacheKey, data: T, userId?: string): Promise<void> {
    const cacheKey = this.getKey(key, userId)

    const entry: CacheEntry<T> = {
      data,
      expires: Date.now() + CACHE_TTLS[key],
    }

    const payload = JSON.stringify(entry)

    if (isIdleTaskContext()) {
      this.enqueueWrite(cacheKey, payload, { priority: 'high' })
      this.requestFlush({ immediate: true })
      return
    }

    this.enqueueWrite(cacheKey, payload)
    this.requestFlush()
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

const FLUSH_INTERVAL_MS = 20
const FLUSH_BATCH_SIZE = 2
