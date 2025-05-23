import Animated from 'react-native-reanimated'
import { useBackdropStyle } from '@/hooks/useBackdropStyle'

export const NavigationBackdrop = () => {
  const containerAnimatedStyle = useBackdropStyle()

  return (
    <Animated.View
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
