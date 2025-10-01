import { View, Dimensions, DimensionValue, Text } from 'react-native'
import { useEffect } from 'react'
import { Button, YStack, Heading } from '../../ui/index'
import { useAppStore } from '@/features/stores'
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

  // Handle redirect when user is logged in
  useEffect(() => {
    if (user) {
      const redirectToProfile = () => {
        // Ensure we land on grid view when redirecting from login
        useAppStore.getState().setProfileNavIntent({
          targetPagerIndex: 0,
          source: 'other',
        })
        router.replace({
          pathname: '/user/[userName]',
          params: { userName: user.userName },
        })
      }
      // Small delay to prevent navigation errors
      const timeout = setTimeout(redirectToProfile, 100)
      return () => clearTimeout(timeout)
    }
  }, [user?.userName])

  if (user) {
    return null // Don't render anything while redirecting
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
            <Heading tag="strong">Refs</Heading>
            <Text style={{ fontFamily: 'Inter', fontWeight: '400' }}>{' is the phonebook for the internet.'}</Text>
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
