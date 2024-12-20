import { useRef, useState, useEffect } from 'react'
import { Button } from '../buttons/Button'
import { YStack } from '../core/Stacks'
import { KeyboardAvoidingView, View, Text as SizableText } from 'react-native'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { AvatarPicker } from '../inputs/AvatarPicker'
import { Dimensions } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { useUserStore } from '@/features/pocketbase'
import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { router } from 'expo-router'
import { LOGIN_STATE } from '@/features/magic'
import { s, c } from '@/features/style'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { ProfileStep } from './ProfileStep'

export const NewUserProfile = () => {
  const { stagedUser, updateStagedUser, register } = useUserStore()
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [
    ['email'],
    ['password', 'passwordConfirm'],
    ['firstName', 'lastName'],
    ['image'],
    ['userName'],
  ]

  const nextStep = async (formValues) => {
    const index = ref.current?.getCurrentIndex() ?? 0
    const updated = updateStagedUser(formValues)

    if (index < data.length - 1) {
      // Valid?
      ref.current?.next()
    } else {
      try {
        console.log(stagedUser)
        const record = await register()

        if (record.userName) {
          router.push(`/user/${record.userName}?firstVisit=true`)
        }
      } catch (error) {
        console.error('Nope', error)
      }
    }
  }

  const renderItem = ({ item, index }: { item: string[], index: number }) => (
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
