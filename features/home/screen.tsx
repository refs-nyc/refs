import { View, Dimensions } from 'react-native'
import { useEffect } from 'react'
import { Button, YStack, Heading } from '../../ui/index'
import Animated, {
  useAnimatedStyle,
  Easing,
  withTiming,
  runOnJS,
  useSharedValue,
} from 'react-native-reanimated'

import { router } from 'expo-router'
import { c, s } from '@/features/style/index'

const dims = Dimensions.get('window')

export function HomeScreen() {
  const rotation = useSharedValue(0)

  // Start the infinite rotation when component mounts
  useEffect(() => {
    const animate = () => {
      rotation.value = withTiming(
        rotation.value + 450,
        {
          duration: 10000,
          easing: Easing.inOut(Easing.cubic),
        },
        () => {
          runOnJS(animate)()
        }
      )
    }

    animate()
  }, [])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    }
  })

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'start',
        padding: s.$4,
        height: s.full,
        marginTop: dims.height * 0.2,
      }}
    >
      <YStack gap={s.$3}>
        <Heading tag="h1normal" style={{ textAlign: 'center', color: c.black }}>
          <Heading tag="strong">Refs</Heading> is the phonebook for the internet.
        </Heading>
        <YStack style={{ alignItems: 'center' }} gap={s.$05}>
          <Button title="Join" onPress={() => router.push('/onboarding')} />
          <Button variant="basic" title="Login" onPress={() => router.push('/user/new')} />
          {/* <Button
            variant="basic"
            title="Login"
            onPress={() => router.push('/user/munus?firstVisit=true')}
          /> */}
        </YStack>
      </YStack>
      <Animated.Image
        style={[
          {
            width: dims.width * 1.2,
            height: dims.width * 1.2,
            position: 'absolute',
            right: -dims.width / 3,
            bottom: -dims.width / 4,
          },
          animatedStyle,
        ]}
        source={require('@/assets/images/homepage.png')}
      />
    </View>
  )
}
