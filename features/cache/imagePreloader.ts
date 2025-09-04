import { Image } from 'expo-image'

class ImagePreloader {
  private static instance: ImagePreloader
  private preloadingQueue: Set<string> = new Set()
  private maxConcurrentPreloads = 3

  static getInstance(): ImagePreloader {
    if (!ImagePreloader.instance) {
      ImagePreloader.instance = new ImagePreloader()
    }
    return ImagePreloader.instance
  }

  // Preload a single image
  async preloadImage(url: string): Promise<void> {
    if (!url || this.preloadingQueue.has(url)) {
      return
    }

    this.preloadingQueue.add(url)
    
    try {
      await Image.prefetch(url)
      console.log(`🖼️ Preloaded image: ${url.substring(0, 50)}...`)
    } catch (error) {
      console.warn(`Failed to preload image: ${url}`, error)
    } finally {
      this.preloadingQueue.delete(url)
    }
  }

  // Preload multiple images in batches
  async preloadImages(urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) return

    // Filter out invalid URLs and already queued URLs
    const validUrls = urls.filter(url => 
      url && 
      !this.preloadingQueue.has(url) &&
      url.startsWith('http')
    )

    if (validUrls.length === 0) return

    console.log(`🖼️ Starting preload of ${validUrls.length} images`)

    // Preload in batches to avoid overwhelming the device
    const batchSize = this.maxConcurrentPreloads
    for (let i = 0; i < validUrls.length; i += batchSize) {
      const batch = validUrls.slice(i, i + batchSize)
      
      await Promise.allSettled(
        batch.map(url => this.preloadImage(url))
      )
      
      // Small delay between batches
      if (i + batchSize < validUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  // Preload images from grid items
  async preloadGridImages(items: any[]): Promise<void> {
    if (!items || items.length === 0) return

    const imageUrls = items
      .map(item => item.image || item.expand?.ref?.image)
      .filter(Boolean)
      .slice(0, 12) // Limit to first 12 images

    await this.preloadImages(imageUrls)
  }

  // Preload images from feed items
  async preloadFeedImages(items: any[]): Promise<void> {
    if (!items || items.length === 0) return

    const imageUrls = items
      .map(item => item.image || item.expand?.ref?.image)
      .filter(Boolean)
      .slice(0, 20) // Limit to first 20 images

    await this.preloadImages(imageUrls)
  }

  // Preload user avatars from directory
  async preloadAvatarImages(users: any[]): Promise<void> {
    if (!users || users.length === 0) return

    const avatarUrls = users
      .map(user => user.image || user.avatar_url)
      .filter(Boolean)
      .slice(0, 15) // Limit to first 15 avatars

    await this.preloadImages(avatarUrls)
  }

  // Get preloading status
  getStatus(): { queueSize: number } {
    return {
      queueSize: this.preloadingQueue.size
    }
  }
}

export const imagePreloader = ImagePreloader.getInstance()
