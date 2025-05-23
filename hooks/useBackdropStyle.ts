import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated'

export const useBackdropStyle = () => {
  const { animatedIndex, disappearsOnIndex, appearsOnIndex, maxOpacity } = useBackdropStore()

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const opacityValue = interpolate(
      animatedIndex!.value || 0,
      [-1, disappearsOnIndex, appearsOnIndex],
      [0, 0, maxOpacity],
      Extrapolation.CLAMP
    )

    return {
      opacity: opacityValue,
      display: opacityValue === 0 ? 'none' : 'flex',
    }
  }, [animatedIndex, disappearsOnIndex, appearsOnIndex, maxOpacity])
  return containerAnimatedStyle
}
