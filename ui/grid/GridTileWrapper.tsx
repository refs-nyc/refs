import React from 'react'
import { YStack } from '../core/Stacks'
import { TouchableOpacity, Pressable, Text } from 'react-native'
import { base } from '@/features/style'
import { GridTileType } from '@/features/types'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c } from '@/features/style'
import { DEFAULT_TILE_SIZE } from './GridTile'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS 
} from 'react-native-reanimated'
import { useEffect } from 'react'

import { useAppStore } from '@/features/stores'

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)

export const GridTileWrapper = ({
  type,
  children,
  id,
  onRemove,
  onPress,
  onLongPress,
  size = DEFAULT_TILE_SIZE,
  tileStyle,
  isShuffling = false,
  promptTextColor,
  promptBorderColor,
  topRightAction,
  onTopRightActionPress,
  isEditMode = false,
}: {
  type: GridTileType
  children: React.ReactNode
  id?: string
  onRemove?: () => void
  onPress?: () => void
  onLongPress?: () => void
  size?: number
  tileStyle?: any
  isShuffling?: boolean
  promptTextColor?: string
  promptBorderColor?: string
  topRightAction?: React.ReactNode
  onTopRightActionPress?: () => void
  isEditMode?: boolean
}) => {
  const { editingProfile, stopEditProfile } = useAppStore()
  
  // Animation values - always start fresh
  const scale = useSharedValue(1)
  const isPressed = useSharedValue(false)
  const textOpacity = useSharedValue(1)

  // Animated style for press feedback
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    }
  })

  // Animated style for text opacity
  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    }
  })

  // Handle press in - smooth spring down
  const handlePressIn = () => {
    isPressed.value = true
    scale.value = withSpring(0.92, {
      damping: 12,
      stiffness: 300,
      mass: 0.8,
    })
  }

  // Handle press out - smooth spring back
  const handlePressOut = () => {
    isPressed.value = false
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 300,
      mass: 0.8,
    })
  }

  // Handle press
  const handlePress = () => {
    if (onPress) {
      onPress()
    }
  }

  // Handle shuffle animation for prompt text
  useEffect(() => {
    if (type === 'prompt') {
      if (isShuffling) {
        // Fade out quickly
        textOpacity.value = withTiming(0, { duration: 150 })
      } else {
        // Fade back in when shuffling stops
        textOpacity.value = withTiming(1, { duration: 200 })
      }
    }
  }, [isShuffling, type])

  const specificStyles = {
    borderWidth: type !== 'image' && type !== '' && type !== 'placeholder' ? 1.5 : 0,
    borderColor: '#333',
  }

  const placeholderStyles =
    type === 'placeholder'
      ? {
          backgroundColor: c.surface2,
        }
      : {}

  const promptStyles =
    type === 'prompt'
      ? {
          borderWidth: 2,
          borderColor: promptBorderColor || '#B0B0B0',
          borderStyle: 'dashed',
          borderDashArray: [4, 4],
          borderMiterLimit: 29,
          backgroundColor: c.surface,
        }
      : {}

  return (
    <AnimatedTouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[
        base.gridTile,
        type === 'placeholder' ? placeholderStyles : specificStyles,
        type === 'prompt' ? promptStyles : {},
        { width: size, justifyContent: 'center', alignItems: 'center' },
        tileStyle,
        animatedStyle,
      ]}
    >
      {(editingProfile || isEditMode) && type !== 'add' && id && (
        <YStack style={{ position: 'absolute', zIndex: 999, top: -8, right: -8 }}>
          <Pressable
            onPress={() => {
              stopEditProfile()
              onRemove && onRemove()
            }}
            style={{
              backgroundColor: c.surface2,
              borderRadius: 100,
            }}
          >
            <Ionicons 
              size={isEditMode ? 16 : 12} 
              style={{ padding: isEditMode ? 8 : 6 }} 
              name="close"
              color={c.muted}
            />
          </Pressable>
        </YStack>
      )}
      {!editingProfile && topRightAction && (
        <YStack style={{ position: 'absolute', zIndex: 999, top: 0, right: 0 }}>
          <Pressable
            onPress={(e) => {
              e.preventDefault?.()
              e.stopPropagation?.()
              onTopRightActionPress && onTopRightActionPress()
            }}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={{ transform: 'translate(5px, -6px)' }}
          >
            {topRightAction}
          </Pressable>
        </YStack>
      )}
      {type === 'placeholder' ? (
        <Text style={{ color: c.muted, fontSize: 16, textAlign: 'center', paddingHorizontal: 10 }}>
          {children}
        </Text>
      ) : type === 'prompt' ? (
        <Animated.Text style={[
          { color: promptTextColor || '#B0B0B0', fontSize: 14, textAlign: 'center', paddingHorizontal: 1, fontWeight: '500' },
          textAnimatedStyle
        ]}>
          {children}
        </Animated.Text>
      ) : type === 'add' ? (
        React.cloneElement(children as React.ReactElement, { isPlaceholder: true })
      ) : (
        children
      )}
    </AnimatedTouchableOpacity>
  )
}
