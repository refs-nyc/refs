import { View, Dimensions, DimensionValue } from 'react-native'
import { useEffect } from 'react'
import { Button, YStack, Heading } from '../../ui/index'
import { pocketbase } from '@/features/pocketbase'
import { Feed } from '@/features/home/feed'
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
    <>
      {pocketbase.authStore.isValid && pocketbase.authStore?.record?.userName ? (
        <>
          <Feed />
        </>
      ) : (
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
              <Button title="Join" onPress={() => router.push('/user/register')} />
              {pocketbase.authStore.isValid && pocketbase.authStore?.record?.userName ? (
                <Button
                  variant="basic"
                  title="Profile"
                  onPress={() => router.push(`/user/${pocketbase.authStore?.record?.userName}`)}
                />
              ) : (
                <Button variant="basic" title="Login" onPress={() => router.push('/user/login')} />
              )}
            </YStack>
          </YStack>
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
        </View>
      )}
    </>
  )
}
