import Animated from 'react-native-reanimated'
import { useBackdropStyle } from '@/hooks/useBackdropStyle'
import { useBackdropStore } from '@/features/style/backdrop'
import { Pressable } from 'react-native'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const NavigationBackdrop = () => {
  const containerAnimatedStyle = useBackdropStyle()
  const { doPress } = useBackdropStore()

  return (
    <AnimatedPressable
      onPress={doPress}
      style={[
        {
          zIndex: 1000,
          position: 'absolute',
          height: '100%',
          width: '100%',
          backgroundColor: 'black',
        },
        containerAnimatedStyle,
      ]}
    />
  )
}
