import { useEffect, useRef } from 'react'
import { useUserStore } from '@/features/pocketbase'
import { router } from 'expo-router'
import { ProfileStep } from '@/ui/profiles/ProfileStep'
import { View, Dimensions } from 'react-native'
import { Stack } from 'expo-router'
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
    if (!stagedUser.email) throw new Error('email required')
    const response = await loginWithPassword(stagedUser.email, password)

    if (pocketbase.authStore.record === null) {
      console.error('Login unsuccessful')
      return
    }
    router.push(`/user/${pocketbase.authStore.record.userName}`)
  }

  const nextStep = async (formValues: any) => {
    const index = ref.current?.getCurrentIndex() ?? 0

    if (index < data.length - 1) {
      const updated = updateStagedUser(formValues)
      // Valid?
      ref.current?.next()
    } else {
      if (formValues.login) {
        const result = await attemptLogin(formValues.login)
      }
    }
  }

  const renderItem = ({ item, index }: { item: string[]; index: number }) => (
    <ProfileStep fields={item} index={index} overrideSubmit={nextStep} />
  )

  return (
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
  )
}
