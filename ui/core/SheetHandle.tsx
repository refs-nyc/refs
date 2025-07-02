import { c, s } from '@/features/style'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

interface SheetHandleProps {
  backgroundColor: string
  display?: 'flex' | 'none'
}

export const SheetHandle = ({ backgroundColor, display = 'flex' }: SheetHandleProps) => {
  // Determine handle color based on background
  const isLightBackground = backgroundColor === c.surface || backgroundColor === c.white || backgroundColor === c.surface2
  const handleColor = isLightBackground 
    ? `${c.grey2}80` // grey2 at 50% opacity
    : `${c.surface}80` // surface at 50% opacity

  return (
    <View
      style={{
        width: '100%',
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        display,
        height: s.$2,
      }}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={{
          backgroundColor: handleColor,
          width: s.$5,
          height: s.$05,
          borderRadius: s.$10,
        }}
      />
    </View>
  )
} 