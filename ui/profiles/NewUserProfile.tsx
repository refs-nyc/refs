import { useRef } from 'react'
import { View } from 'react-native'
import { Dimensions } from 'react-native'
import { useUserStore } from '@/features/pocketbase'
import { router } from 'expo-router'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { ProfileStep } from './ProfileStep'

export const NewUserProfile = () => {
  const { stagedUser, updateStagedUser, register } = useUserStore()
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [
    ['email'],
    ['location'],
    ['password', 'passwordConfirm'],
    ['firstName', 'lastName'],
    ['image'],
    ['userName'],
  ]

  // TODO: remove any type
  const nextStep = async (formValues: any) => {
    const index = ref.current?.getCurrentIndex() ?? 0
    const updated = updateStagedUser(formValues)

    if (index < data.length - 1) {
      // Valid?
      ref.current?.next()
    } else {
      try {
        const record = await register()

        if (record.userName) {
          router.push(`/user/${record.userName}?firstVisit=true`)
        }
      } catch (error) {
        console.error('Nope', error)
      }
    }
  }

  const renderItem = ({ item, index }: { item: string[]; index: number }) => (
    <ProfileStep fields={item} index={index} onComplete={nextStep} />
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
