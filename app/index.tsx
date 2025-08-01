import { HomeScreen } from '@/features/home/screen'
import { useAppStore } from '@/features/stores'
import { LoadingScreen } from '@/ui/display/LoadingScreen'
import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

export default function Screen() {
  const { isInitialized, isBackgroundLoading } = useAppStore()
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isInitialized && !isBackgroundLoading) {
      // Fade in the home screen when background loading completes
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start()
    }
  }, [isInitialized, isBackgroundLoading, fadeAnim])

  if (!isInitialized) {
    return <LoadingScreen />
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <HomeScreen />
    </Animated.View>
  )
}
