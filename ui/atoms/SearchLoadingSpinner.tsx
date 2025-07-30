import { View } from 'react-native'
import { c, s } from '@/features/style'
import { SizableText } from '../typo/SizableText'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  Easing
} from 'react-native-reanimated'
import { useEffect } from 'react'

export function SearchLoadingSpinner() {
  const leftCircleRotation = useSharedValue(0)
  const rightCircleRotation = useSharedValue(0)

  useEffect(() => {
    // Left circle spins clockwise
    leftCircleRotation.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1, // infinite
      false
    )

    // Right circle spins counter-clockwise
    rightCircleRotation.value = withRepeat(
      withTiming(-360, {
        duration: 2500,
        easing: Easing.linear,
      }),
      -1, // infinite
      false
    )
  }, [])

  const leftCircleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${leftCircleRotation.value}deg` }],
  }))

  const rightCircleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rightCircleRotation.value}deg` }],
  }))

  return (
    <View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: s.$4,
      }}
    >
      {/* Venn Diagram Container */}
      <View
        style={{
          position: 'relative',
          width: 100,
          height: 50,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Left Circle */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              width: 50,
              height: 50,
              borderRadius: 25,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: c.olive,
              backgroundColor: 'transparent',
            },
            leftCircleStyle,
          ]}
        />
        
        {/* Right Circle */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              right: 0,
              width: 50,
              height: 50,
              borderRadius: 25,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: c.olive,
              backgroundColor: 'transparent',
            },
            rightCircleStyle,
          ]}
        />
      </View>

      <SizableText 
        style={{ 
          color: c.grey2, 
          marginTop: s.$3,
          textAlign: 'center' 
        }}
      >
        Finding people at the intersection...
      </SizableText>
    </View>
  )
} 