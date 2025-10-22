import { useState, useEffect, useRef } from 'react'
import { Image } from 'expo-image'
import { View, TouchableOpacity, Animated, Pressable } from 'react-native'
import { pinataUpload } from '@/features/pinata'
import type { ImagePickerAsset } from 'expo-image-picker'
import { useNetInfo } from '@react-native-community/netinfo'
import { Ionicons } from '@expo/vector-icons'
import { SearchLoadingSpinner } from '@/ui/atoms/SearchLoadingSpinner'
import { s, c } from '@/features/style'
import { useAppStore } from '@/features/stores'

export const PinataImage = ({
  asset,
  round = false,
  style,
  onSuccess,
  onReplace,
  onFail,
  size = 200,
  allowBackgroundUpload = false,
  itemId,
}: {
  asset: ImagePickerAsset | string
  round?: boolean
  style?: any
  onSuccess: (url: string) => void
  onReplace: () => void
  onFail: () => void
  size?: number
  allowBackgroundUpload?: boolean
  itemId?: string
}) => {
  const [loading, setLoading] = useState(false)
  const [uploadFailed, setUploadFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [source, setSource] = useState(typeof asset === 'string' ? asset : asset?.uri)
  const [pinataSource, setPinataSource] = useState(typeof asset === 'string' ? asset : '')
  const { isConnected } = useNetInfo()
  const finalizePendingImageUpload = useAppStore((state) => state.finalizePendingImageUpload)
  const failPendingImageUpload = useAppStore((state) => state.failPendingImageUpload)

  // Create animation values
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Track a single in-flight upload to avoid duplicate attempts
  const isUploadingRef = useRef(false)
  // Track if we've already auto-retried on reconnect to avoid loops
  const didReconnectRetryRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('upload-timeout')), ms)
      promise
        .then((v) => {
          clearTimeout(timer)
          resolve(v)
        })
        .catch((e) => {
          clearTimeout(timer)
          reject(e)
        })
    })
  }

  const handleLongpress = () => {
    if (source || pinataSource) onReplace()
  }

  const handleRetry = async () => {
    if (typeof asset === 'string' || retrying) return
    if (isUploadingRef.current) return
    
    setRetrying(true)
    setUploadFailed(false)
    isUploadingRef.current = true
    
    try {
      const url = await withTimeout(pinataUpload(asset), 25000)
      setPinataSource(url)
      onSuccess(url)
      void finalizePendingImageUpload(asset.uri, url)
      setRetrying(false)
      didReconnectRetryRef.current = false
    } catch (error) {
      console.warn('Retry upload failed:', error)
      setUploadFailed(true)
      setRetrying(false)
      failPendingImageUpload(asset.uri)
    }
    isUploadingRef.current = false
  }

  // Start pulsing animation when loading
  useEffect(() => {
    // @ts-ignore
    let pulseAnimation

    if (loading) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      )

      pulseAnimation.start()
    } else if (pulseAnimation) {
      // @ts-ignore
      pulseAnimation?.stop()
    }

    return () => {
      // @ts-ignore
      if (pulseAnimation) pulseAnimation.stop()
    }
  }, [loading])

  // Handle image upload
  useEffect(() => {
    const load = async () => {
      if (typeof asset === 'string') {
        // Already a URL, no upload needed
        setSource(asset)
        setPinataSource(asset)
        onSuccess(asset)
        return
      }

      // For local assets, show immediately if background upload is allowed
      if (allowBackgroundUpload) {
        setSource(asset.uri)
        setLoading(false) // Don't show loading spinner for background uploads
        onSuccess(asset.uri) // Call onSuccess immediately with local URI
        
        // Start background upload
        ;(async () => {
          if (isUploadingRef.current) return
          isUploadingRef.current = true
          try {
            const url = await withTimeout(pinataUpload(asset), 25000)
            void finalizePendingImageUpload(asset.uri, url)
            if (!isMountedRef.current) return
            // Don't update pinataSource here to avoid visual flash; parent may react to onSuccess elsewhere
            setPinataSource(url)
            setUploadFailed(false)
            onSuccess(url)
          } catch (error) {
            console.warn('Background upload failed:', error)
            setUploadFailed(true)
            failPendingImageUpload(asset.uri)
          }
          isUploadingRef.current = false
        })()
      } else {
        // Traditional blocking upload
        try {
          setLoading(true)
          const url = await withTimeout(pinataUpload(asset), 30000)
          void finalizePendingImageUpload(asset.uri, url)
          if (!isMountedRef.current) return
          setPinataSource(url)
          onSuccess(url)

          // Start fade-in animation for pinata image
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setLoading(false)
          })
        } catch (error) {
          console.warn('Upload failed:', error)
          setLoading(false)
          setUploadFailed(true)
          failPendingImageUpload(asset.uri)
          onFail()
        }
      }
    }
    
    // Always run when asset changes and we're connected
    if (isConnected) load()
  }, [asset, isConnected, allowBackgroundUpload])

  // Auto-retry once on reconnect if a background upload previously failed
  useEffect(() => {
    if (!allowBackgroundUpload) return
    if (uploadFailed && isConnected && !isUploadingRef.current && !didReconnectRetryRef.current) {
      didReconnectRetryRef.current = true
      // Attempt a single automatic retry
      // Reuse handleRetry if possible; falls back to background code path timing
      handleRetry()
    }
  }, [isConnected, uploadFailed, allowBackgroundUpload])

  const displaySource = source // Always use local source to prevent flashing

  return (
    <TouchableOpacity
      onLongPress={handleLongpress}
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          ...style,
          width: size,
          height: size,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: round ? 1000 : 10,
          position: 'relative',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: pinataSource ? Animated.add(1, fadeAnim) : pulseAnim,
          }}
        >
          <Image
            key={`source-${displaySource}`}
            contentFit="cover"
            style={{
              width: size,
              height: size,
            }}
            source={displaySource}
          />
        </Animated.View>

        {/* Upload status indicators */}
        {loading && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SearchLoadingSpinner size={40} />
          </View>
        )}

        {/* Retry badge */}
        {uploadFailed && !loading && (
          <Pressable
            onPress={handleRetry}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: c.surface2,
              borderWidth: 1,
              borderColor: c.black,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: c.black,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            {retrying ? (
              <SearchLoadingSpinner size={16} />
            ) : (
              <Ionicons 
                name="cloud-offline-outline" 
                size={12} 
                color={c.black} 
              />
            )}
          </Pressable>
        )}
      </View>
    </TouchableOpacity>
  )
}
