import React, { useState, useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { c } from '@/features/style'

interface LazyLoaderProps {
  children: React.ReactNode
  delay?: number
  fallback?: React.ReactNode
}

export const LazyLoader: React.FC<LazyLoaderProps> = ({ children, delay = 100, fallback }) => {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRender(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (!shouldRender) {
    return (
      fallback || (
        <View
          style={{
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.surface,
          }}
        >
          <ActivityIndicator size="small" color={c.grey1} />
        </View>
      )
    )
  }

  return <>{children}</>
}

// Hook for intersection observer (simplified for React Native)
export const useIntersectionObserver = (threshold = 100) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Simple implementation - assume visible after a delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, threshold)

    return () => clearTimeout(timer)
  }, [threshold])

  return isVisible
}
