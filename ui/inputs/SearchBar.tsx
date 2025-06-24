import { useState, useRef, useEffect } from 'react'
import { View, TextInput } from 'react-native'
import { s, c, t } from '@/features/style'
import { TypewriterText } from '../atoms/TypewriterText'
import { Image } from 'expo-image'
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated'
import { Pressable, TouchableWithoutFeedback } from 'react-native-gesture-handler'
import Ionicons from '@expo/vector-icons/Ionicons'

export const SearchBar = ({
  searchTerm = '',
  onChange,
  onFocus,
  onBlur,
}: {
  searchTerm?: string
  onChange: (str: string) => void
  onFocus: () => void
  onBlur: () => void
}) => {
  const [textState, setTextState] = useState(searchTerm)

  // Variables
  const y = useSharedValue(0)
  const scaleY = useSharedValue(1)

  // Refs
  const ref = useRef<TextInput>(null)

  // Reset
  const reset = () => {
    setTextState('')
    ref.current?.clear()
  }

  const translateY = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }],
  }))
  const height = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.get() }],
  }))

  useEffect(() => {
    setTextState(searchTerm)
  }, [searchTerm])
  useEffect(() => onChange(textState), [textState])

  return (
    <>
      <View
        style={[
          {
            paddingHorizontal: s.$1,
            width: '100%',
            zIndex: 99,
          },
        ]}
      >
        <Animated.View
          style={[
            {
              // paddingHorizontal: s.$2,
              width: '100%',
              height: 50,
              backgroundColor: c.black,
              position: 'absolute',
              zIndex: 0,
              left: s.$1,
              top: 0,
              borderRadius: s.$3,
              transformOrigin: 'bottom',
            },
            height,
          ]}
        />
        <TouchableWithoutFeedback
          onPressIn={() => {
            y.set(withSpring(6))
            scaleY.set(withSpring(0.8))
          }}
          onPressOut={() => {
            y.set(withSpring(0))
            scaleY.set(withSpring(1))
          }}
        >
          <Animated.View
            style={[
              {
                flexDirection: 'row',
                backgroundColor: c.surface,
                padding: s.$05,
                borderColor: c.black,
                borderWidth: 2,
                borderRadius: s.$3,
                gap: s.$08,
              },
              translateY,
            ]}
          >
            <Image
              style={{ width: s.$2, height: s.$2, margin: s.$025 }}
              source={require('@/assets/icons/Logo.png')}
            ></Image>

            <TextInput
              ref={ref}
              style={{ flex: 1, ...t.p, height: 30, lineHeight: 20 }}
              onFocus={() => {
                y.set(withSpring(6))
                scaleY.set(withSpring(0.8))
                onFocus()
              }}
              onBlur={() => {
                y.set(withSpring(0))
                scaleY.set(withSpring(1))
                reset()
                onBlur()
              }}
              autoFocus={false}
              placeholder="Search anything"
              onChangeText={setTextState}
              placeholderTextColor={c.black}
              clearButtonMode="while-editing"
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </>
  )
}

/**
 * Just for display
 */
export const ControlledSearchBar = ({ searchTerm = '' }) => {
  // Variables
  const y = useSharedValue(0)
  const scaleY = useSharedValue(1)

  // Refs
  const ref = useRef<TextInput>(null)

  const translateY = useAnimatedStyle(() => ({
    transform: [{ translateY: y.get() }],
  }))

  return (
    <View style={{ paddingHorizontal: s.$2, width: '100%' }}>
      <Animated.View
        style={[
          {
            width: '100%',
            height: 50,
            backgroundColor: c.black,
            position: 'absolute',
            zIndex: 0,
            left: s.$2,
            top: 0,
            borderRadius: s.$3,
            transformOrigin: 'bottom',
          },
          translateY,
        ]}
      />
      <TouchableWithoutFeedback
        onPressIn={() => {
          y.set(withSpring(6))
          scaleY.set(withSpring(0.8))
        }}
        onPressOut={() => {
          y.set(withSpring(0))
          scaleY.set(withSpring(1))
        }}
      >
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              backgroundColor: c.surface,
              padding: s.$05,
              borderColor: c.black,
              borderWidth: 2,
              borderRadius: s.$3,
              alignItems: 'center',
              gap: s.$08,
            },
          ]}
        >
          <Image
            style={{ width: s.$2, height: s.$2, margin: s.$025 }}
            source={require('@/assets/icons/Logo.png')}
          />
          <TypewriterText style={{ flex: 1 }} text={searchTerm} />
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  )
}
