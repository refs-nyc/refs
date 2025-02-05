import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight' // You'll need to create this hook
import { s } from '@/features/style'
import Animated, { useAnimatedStyle, withSpring, Layout, FadeIn } from 'react-native-reanimated'

export function DrawerContent({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()

  const animatedStyles = useAnimatedStyle(() => ({
    flex: 1,
    maxHeight: '90%', // Prevents drawer from taking full screen
    paddingBottom: withSpring(Math.max(keyboardHeight, insets.bottom), {
      damping: 20,
      stiffness: 200,
    }),
  }))

  return (
    <Animated.View style={animatedStyles}>
      <Animated.View layout={Layout.springify().damping(20).stiffness(200)}>
        {children}
      </Animated.View>
    </Animated.View>
  )
}
