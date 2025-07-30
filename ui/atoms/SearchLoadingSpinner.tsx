import React, { useEffect, useRef } from 'react'
import { View, Animated } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { c } from '@/features/style'

interface SearchLoadingSpinnerProps {
  size?: number
}

export const SearchLoadingSpinner: React.FC<SearchLoadingSpinnerProps> = ({ size = 71 }) => {
  const leftCircleRotation = useRef(new Animated.Value(0)).current
  const rightCircleRotation = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const startAnimation = () => {
      // Left circle spins clockwise
      Animated.loop(
        Animated.timing(leftCircleRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start()

      // Right circle spins counter-clockwise
      Animated.loop(
        Animated.timing(rightCircleRotation, {
          toValue: -1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start()
    }

    startAnimation()
  }, [leftCircleRotation, rightCircleRotation])

  const leftCircleSpin = leftCircleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const rightCircleSpin = rightCircleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  })

  const scale = size / 71 // Scale factor based on original 71px size

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size * 0.66, position: 'relative' }}>
        {/* Left circle */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size * 0.66,
            height: size * 0.66,
            transform: [{ rotate: leftCircleSpin }],
          }}
        >
          <Svg width={size * 0.66} height={size * 0.66} viewBox="0 0 47 47" fill="none">
            <Circle 
              cx="23.5" 
              cy="23.5" 
              r="23" 
              stroke={c.black} 
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          </Svg>
        </Animated.View>

        {/* Right circle */}
        <Animated.View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: size * 0.66,
            height: size * 0.66,
            transform: [{ rotate: rightCircleSpin }],
          }}
        >
          <Svg width={size * 0.66} height={size * 0.66} viewBox="0 0 47 47" fill="none">
            <Circle 
              cx="23.5" 
              cy="23.5" 
              r="23" 
              stroke={c.black} 
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          </Svg>
        </Animated.View>
      </View>
    </View>
  )
} 