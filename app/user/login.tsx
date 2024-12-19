import { useEffect, useRef } from 'react'
import { useUserStore } from '@/features/pocketbase'
import { router } from 'expo-router'
import { ProfileStep } from '@/ui/profiles/NewUserProfile'
import { View, Dimensions } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { pocketbase } from '@/features/pocketbase'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

const win = Dimensions.get('window')

export default function Screen() {
  const ref = useRef<ICarouselInstance>(null)
  const { user, stagedUser, updateStagedUser, loginWithPassword } = useUserStore()
  const data = [['email'], ['login']]

  useEffect(() => {
    if (stagedUser.email) {
      ref.current?.scrollTo({ count: 1 })
      console.log('Scroll to 1')
    }
  }, [stagedUser])

  const attemptLogin = async (password: string) => {
    try {
      const response = await loginWithPassword(stagedUser.email, password)

      router.push(`/users/${pocketbase.authStore.record.userName}`)
    } catch (error) {
      // console.error(error)
    }
  }

  const nextStep = async (formValues) => {
    console.log(formValues)
    const index = ref.current?.getCurrentIndex()

    if (index < data.length - 1) {
      const updated = updateStagedUser(formValues)
      console.log(updated)
      // Valid?
      ref.current?.next()
    } else {
      if (formValues.login) {
        const result = await attemptLogin(formValues.login)
        console.log(result)
      }
    }
  }

  const renderItem = ({ item, index }) => (
    <ProfileStep fields={item} index={index} overrideSubmit={nextStep} />
  )

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Login',
          // presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false,
        }}
      />
      <View style={{ flex: 1 }}>
        <Carousel
          loop={false}
          ref={ref}
          data={data}
          width={win.width}
          height={win.height}
          enabled={false}
          renderItem={renderItem}
        />
      </View>
    </>
  )
}
