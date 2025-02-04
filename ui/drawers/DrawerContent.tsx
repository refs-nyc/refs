import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight' // You'll need to create this hook
import { s } from '@/features/style'

export function DrawerContent({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  const keyboardHeight = useKeyboardHeight()

  return (
    <View
      style={{
        flex: 1,
        maxHeight: '90%', // Prevents drawer from taking full screen
        paddingBottom: Math.max(keyboardHeight, insets.bottom),
      }}
    >
      {children}
    </View>
  )
}
