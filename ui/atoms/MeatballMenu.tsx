import { View, Pressable } from 'react-native'
import { s, c } from '@/features/style'
import CheckboxIcon from '@/assets/icons/checkbox.svg'
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated'

export const Checkbox = ({ color = c.grey2, onPress }: { color?: string; onPress: () => void }) => {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    }
  })

  const handlePressIn = () => {
    scale.value = withSpring(0.92, {
      damping: 12,
      stiffness: 300,
      mass: 0.8,
    })
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 300,
      mass: 0.8,
    })
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          width: s.$5,
          height: s.$5,
          borderRadius: s.$10,
          aspectRatio: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: c.surface,
          shadowColor: '#000',
          shadowOffset: {
            width: 1,
            height: 5,
          },
          shadowOpacity: 0.25,
          shadowRadius: 2,
        }}
      >
        <CheckboxIcon />
        {/* <SvgUri uri={CheckboxIcon} /> */}
      </Pressable>
    </Animated.View>
  )
}

export const MeatballMenu = ({
  color = c.grey2,
  onPress,
}: {
  color?: string
  onPress: () => void
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: s.$4,
        height: s.$3,
        aspectRatio: 1,
        gap: 2,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'red',
      }}
    >
      <View style={{ width: 4, height: 4, borderRadius: s.$05, backgroundColor: color }} />
      <View style={{ width: 4, height: 4, borderRadius: s.$05, backgroundColor: color }} />
      <View style={{ width: 4, height: 4, borderRadius: s.$05, backgroundColor: color }} />
    </Pressable>
  )
}
