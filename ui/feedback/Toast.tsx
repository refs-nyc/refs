import { useEffect, useRef, useState } from 'react'
import { Animated, Text, StyleSheet } from 'react-native'
import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const SHOW_DURATION_MS = 2400
const FADE_DURATION_MS = 160

export function GlobalToast() {
  const { toast, clearToast } = useAppStore()
  const insets = useSafeAreaInsets()
  const [currentToast, setCurrentToast] = useState<{ id: number; message: string } | null>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(12)).current
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!toast) return

    setCurrentToast(toast)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: FADE_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start()

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 12,
          duration: FADE_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setCurrentToast(null)
          clearToast()
        }
      })
    }, SHOW_DURATION_MS)
  }, [toast?.id])

  if (!currentToast) return null

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          bottom: Math.max(48, insets.bottom + 32),
        },
      ]}
    >
      <Text style={styles.text}>{currentToast.message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 12000,
    borderRadius: 18,
    backgroundColor: 'rgba(24,24,24,0.9)',
    paddingHorizontal: Number(s.$1),
    paddingVertical: Number(s.$075),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  text: {
    color: c.surface,
    fontSize: Number(s.$09),
    fontFamily: 'System',
    fontWeight: '600',
    textAlign: 'center',
  },
})
