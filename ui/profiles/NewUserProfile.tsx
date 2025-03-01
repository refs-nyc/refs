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
    ['firstName', 'lastName'],
    ['location'],
    ['password', 'passwordConfirm'],
    ['image'],
    ['done'],
  ]

  // TODO: remove any type
  const nextStep = async (formValues?: any) => {
    const index = ref.current?.getCurrentIndex() ?? 0

    if (data[index].includes('image')) {
      // Final step
      updateStagedUser(formValues)
      try {
        const record = await register()

        if (record.userName) {
          ref.current?.next()
        }
      } catch (error) {
        console.error('Nope', error)
      }
    } else if (data[index].includes('done')) {
      // When leaving done
      router.push(`/users/${stagedUser.userName}`)
    } else {
      updateStagedUser(formValues)
      ref.current?.next()
    }

    console.log(formValues)
  }

  const renderItem = ({ item, index }: { item: string[]; index: number }) => {
    const titles = {
      firstName: 'Let us know who you are',
      location: 'Where are you?',
      image: 'Upload a profile photo to get started',
      done: 'Thanks for signing up!',
    }

    return (
      <ProfileStep
        key={item.join('-')}
        fields={item}
        title={titles?.[item[0] || '']}
        index={index}
        onComplete={nextStep}
      />
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Carousel
        onConfigurePanGesture={(gesture) => {
          'worklet'
          gesture.activeOffsetX([-win.width, 10])
        }}
        loop={false}
        ref={ref}
        data={data}
        width={win.width}
        height={win.height}
        renderItem={renderItem}
      />
    </View>
  )
}
