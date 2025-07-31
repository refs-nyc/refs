import { useEffect } from 'react'
import { Image } from 'expo-image'
import { useAppStore } from '@/features/stores'

interface ImagePreloaderProps {
  images: string[]
}

export const ImagePreloader = ({ images }: ImagePreloaderProps) => {
  const { getSignedUrl } = useAppStore()

  useEffect(() => {
    // Preload critical images in background
    const preloadImages = async () => {
      const preloadPromises = images.slice(0, 10).map(async (imageUrl) => {
        try {
          // For Pinata images, get signed URL
          if (imageUrl.includes('mypinata.cloud')) {
            await getSignedUrl(imageUrl)
          }
          // For other images, just prefetch
          await Image.prefetch(imageUrl)
        } catch (error) {
          // Silently fail for preloading
          console.debug('Failed to preload image:', imageUrl)
        }
      })

      // Don't await - let them load in background
      Promise.allSettled(preloadPromises)
    }

    preloadImages()
  }, [images, getSignedUrl])

  // This component doesn't render anything
  return null
} 