import 'react-native-gesture-handler'
import { Dimensions, StyleSheet, Pressable } from 'react-native'
import { View } from 'tamagui'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
  SlideInDown,
  SlideOutDown,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
import { useLayoutEffect, useRef, useState } from 'react'

const win = Dimensions.get('window')
const HEIGHT = 'auto'
const OVERDRAG = 20
const ACCENT_COLOR = '#FFF0FF'
const BACKDROP_COLOR = '#FFF0FF'
const BACKGROUND_COLOR = '#FFF0FF'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function Drawer({
  children,
  close,
  height,
}: {
  children?: React.ReactNode
  close: () => void
  height?: 'auto' | number
}) {
  const accent = useSharedValue(ACCENT_COLOR)
  const offset = useSharedValue(0)
  const ref = useRef(null)
  const [realHeight, setRealHeight] = useState(0)

  const toggleSheet = () => {
    offset.set(0)
    close()
  }

  const pan = Gesture.Pan()
    .onChange((event) => {
      const offsetDelta = event.changeY + offset.get()

      const clamp = Math.max(-OVERDRAG, offsetDelta)
      offset.set(offsetDelta > 0 ? offsetDelta : withSpring(clamp))
    })
    .onFinalize(() => {
      console.log('finalize', realHeight)
      if (offset.get() < realHeight / 3) {
        offset.set(withSpring(0))
      } else {
        offset.set(
          withTiming(realHeight, {}, () => {
            runOnJS(toggleSheet)()
          })
        )
      }
    })

  const translateY = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
  }))

  return (
    <>
      <AnimatedPressable
        style={styles.backdrop}
        entering={FadeIn}
        exiting={FadeOut}
        onPress={toggleSheet}
      />
      <Animated.View
        style={[styles.sheet, translateY]}
        entering={SlideInDown.springify().damping(15)}
        exiting={SlideOutDown}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.gripWrapper}>
            <View style={styles.grip} />
          </View>
        </GestureDetector>

        <View mt="$4" pb="$10" onLayout={(event) => setRealHeight(event.nativeEvent.layout.height)}>
          {children}
        </View>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  sheet: {
    backgroundColor: 'white',
    padding: 16,
    height: HEIGHT,
    width: '100%',
    position: 'absolute',
    bottom: -OVERDRAG * 1.1,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    zIndex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  gripWrapper: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 10,
  },
  grip: {
    flex: 0,
    width: 75,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'black',
  },
})
