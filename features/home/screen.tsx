import { View, Dimensions, DimensionValue } from 'react-native'
import { useEffect } from 'react'
import { Button, YStack, Heading } from '../../ui/index'
import { useAppStore } from '@/features/pocketbase'
import Animated, {
  useAnimatedStyle,
  Easing,
  withTiming,
  runOnJS,
  useSharedValue,
} from 'react-native-reanimated'

import { router } from 'expo-router'
import { c, s } from '@/features/style/index'
import { Feed } from './feed'

const dims = Dimensions.get('window')

function RotatingImage() {
  const rotation = useSharedValue(0)

  // Start the infinite rotation when component mounts
  useEffect(() => {
    const animate = () => {
      rotation.value = withTiming(
        rotation.value + 450,
        {
          duration: 20000,
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
    <Animated.Image
      style={[
        {
          width: dims.width * 1.2,
          height: dims.width * 1.2,
          position: 'absolute',
          right: -dims.width / 3,
          bottom: -dims.width / 2,
        },
        animatedStyle,
      ]}
      source={require('@/assets/images/homepage.png')}
    />
  )
}

export function HomeScreen() {
  const { user } = useAppStore()

  if (user) {
    // if the user is logged in, show the user's profile
    return <Feed />
  } else {
    // if the user is not logged in, show the home screen
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-start',
          padding: s.$4,
          height: s.full as DimensionValue,
          marginTop: dims.height * 0.2,
        }}
      >
        <YStack gap={s.$3}>
          <Heading tag="h1normal" style={{ textAlign: 'center', color: c.black }}>
            <Heading tag="strong">Refs</Heading> is the phonebook for the internet.
          </Heading>
          <YStack style={{ alignItems: 'center' }} gap={s.$05}>
            <Button title="Join" onPress={() => router.push('/onboarding')} />
            <Button variant="basic" title="Login" onPress={() => router.push('/user/login')} />
          </YStack>
        </YStack>
        <RotatingImage />
      </View>
    )
  }
}
