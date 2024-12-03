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

const win = Dimensions.get('window')
const HEIGHT = win.height * 0.6
const OVERDRAG = 20
const ACCENT_COLOR = '#FFF0FF'
const BACKDROP_COLOR = '#FFF0FF'
const BACKGROUND_COLOR = '#FFF0FF'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function Drawer({ children, close }: { children?: React.ReactNode; close: () => void }) {
  const accent = useSharedValue(ACCENT_COLOR)
  const offset = useSharedValue(0)

  const toggleSheet = () => {
    offset.value = 0
    close()
  }

  const pan = Gesture.Pan()
    .onChange((event) => {
      const offsetDelta = event.changeY + offset.value

      const clamp = Math.max(-OVERDRAG, offsetDelta)
      offset.value = offsetDelta > 0 ? offsetDelta : withSpring(clamp)
    })
    .onFinalize(() => {
      if (offset.value < HEIGHT / 3) {
        offset.value = withSpring(0)
      } else {
        offset.value = withTiming(HEIGHT, {}, () => {
          runOnJS(toggleSheet)()
        })
      }
    })

  const translateY = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
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
        {children}
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
    height: 4,
  },
  grip: {
    flex: 0,
    width: 75,
    height: 4,
    borderRadius: 2,
  },
})
