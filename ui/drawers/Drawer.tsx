import 'react-native-gesture-handler'
import { StyleSheet, Pressable, View, Dimensions } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  useAnimatedKeyboard,
} from 'react-native-reanimated'
import { s, c } from '@/features/style'
import { useRef, useState } from 'react'

const win = Dimensions.get('window')
const HEIGHT = 'auto'
const OVERDRAG = 20
const ACCENT_COLOR = '#FFF0FF'
const BACKGROUND_COLOR = c.surface
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

  const insets = useSafeAreaInsets()

  const keyboard = useAnimatedKeyboard()
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

  const maxHeight = useAnimatedStyle(() => ({
    maxHeight: withSpring(win.height - keyboard.height.get() - insets.top - insets.bottom, {
      damping: 15,
      stiffness: 100,
    }),
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
        style={[
          styles.sheet,
          translateY,
          maxHeight,
          {
            paddingBottom: Math.max(insets.bottom, keyboard.height.get() > 0 ? 8 : 0),
          },
        ]}
        entering={SlideInDown.springify().damping(15)}
        exiting={SlideOutDown}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.gripWrapper}>
            <View style={styles.grip} />
          </View>
        </GestureDetector>

        <View onLayout={(event) => setRealHeight(event.nativeEvent.layout.height)}>{children}</View>
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
    backgroundColor: BACKGROUND_COLOR,
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
    height: 20,
    // backgroundColor: 'red',
  },
  grip: {
    flex: 0,
    width: 75,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'black',
  },
})
