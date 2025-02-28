import { useState, useEffect } from 'react'
import { Image, type ImageProps } from 'expo-image'
import { getPinataImage, type OptimizeImageOptions } from '@/features/pinata'

export const SimplePinataImage = ({
  originalSource,
  placeholder,
  placeholderContentFit = 'cover',
  imageOptions,
  ...props
}: {
  originalSource: string
  placeholder?: string
  placeholderContentFit?: ImageProps['contentFit']
  imageOptions: OptimizeImageOptions
} & Omit<ImageProps, 'source'>) => {
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('')

  useEffect(() => {
    // Reset loading state when original source changes
    setLoading(true)

    const load = async () => {
      if (originalSource.includes('pinata')) {
        setSource(originalSource)
        setLoading(false)
      } else {
        try {
          const newSource = await getPinataImage(originalSource, imageOptions)
          setSource(newSource)
          setLoading(false)
        } catch (error) {
          console.error(error)
          // Fall back to placeholder or original source on error
          setSource(placeholder || originalSource)
          setLoading(false)
        }
      }
    }

    load()
  }, [originalSource, imageOptions])

  // Always render an image - either the placeholder during loading or the final source
  return (
    <Image
      {...props}
      contentFit={loading ? placeholderContentFit : 'cover'}
      source={loading && placeholder ? placeholder : source || placeholder || originalSource}
    />
  )
}
