import { useRef, useState, useEffect } from 'react'
import { YStack, Heading } from '@/ui'
import { View, Text as Paragraph } from 'react-native'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { AvatarPicker } from '../inputs/AvatarPicker'
import { Button, Dimensions } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { useProfileStore } from '@/features/canvas/stores'
import { router } from 'expo-router'
import { useMagicContext } from '@/features/magic'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

type StepInput1 = {
  email: string
}

type StepInput2 = {
  firstName: string
  lastName: string
}

type StepInput3 = {
  userName: string
}

type StepInput4 = {
  image: string
}

const ProfileStep = ({ fields, index, onComplete }) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StepInput1 | StepInput2 | StepInput3 | StepInput4>()

  const { login, logout, loginState, LOGIN_STATE } = useMagicContext()

  const formValues = watch()

  const onSubmit = async (d) => {
    if (fields.includes('email')) {
      try {
        console.log(formValues.email)
        await login(formValues.email)
        onComplete(formValues)
      } catch (error) {
        console.error(error)
      }
    }
    onComplete(formValues)
  }

  const onErrors = (d) => {
    console.log('Failure')

    console.log(formValues)
    console.log(d)
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center' }} mx="$6" my="$4">
      <YStack gap="$4" pt="$12" pb="$8">
        <Heading tag="h1" ta="center" col="$color12">
          {index === 0 && 'Login using your email'}
          {index === 1 && 'Let us know who you are to wrap up'}
          {index === 2 && 'Choose a username'}
          {index === 3 && '...and upload a profile photo'}
        </Heading>
      </YStack>

      <YStack gap="$6">
        {fields.includes('email') && loginState !== LOGIN_STATE.LOGGED_IN && (
          <>
            <Controller
              name="email"
              control={control}
              rules={{
                required: true,
                pattern:
                  /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
              }}
              render={({ field: { onChange, value } }) => (
                <FormFieldWithIcon
                  onChange={onChange}
                  type="email"
                  id="email"
                  placeholder="Email"
                  value={value}
                />
              )}
            />
            {errors.email && <Paragraph ta="center">This field is required</Paragraph>}
          </>
        )}
        {fields.includes('email') && loginState === LOGIN_STATE.LOGGED_IN && (
          <Button title="Welcome back" onPress={onComplete} />
        )}

        {/* FirstName */}
        {fields.includes('firstName') && (
          <>
            <Controller
              name="firstName"
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <FormFieldWithIcon
                  onChange={onChange}
                  type="user"
                  id="firstName"
                  placeholder="First Name"
                  value={value}
                />
              )}
            />
            {errors.firstName && <Paragraph ta="center">This field is required</Paragraph>}
          </>
        )}

        {/* LastName */}
        {fields.includes('lastName') && (
          <>
            <Controller
              name="lastName"
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <FormFieldWithIcon
                  onChange={onChange}
                  type="user"
                  id="lastName"
                  placeholder="First Name"
                  value={value}
                />
              )}
            />
            {errors.lastName && <Paragraph ta="center">This field is required</Paragraph>}
          </>
        )}
        {/* UserName */}
        {fields.includes('userName') && (
          <>
            <Controller
              name="userName"
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <FormFieldWithIcon
                  onChange={onChange}
                  type="user"
                  id="userName"
                  placeholder="@username"
                  value={value}
                />
              )}
            />
            {errors.userName && <Paragraph ta="center">This field is required</Paragraph>}
          </>
        )}

        {fields.includes('image') && (
          <>
            <Controller
              name="image"
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <AvatarPicker
                  onComplete={(s) => {
                    console.log(s)
                    onChange(s)
                  }}
                  source={value}
                />
              )}
            />
            {errors.image && <Paragraph ta="center">This field is required</Paragraph>}
          </>
        )}
      </YStack>

      {/* <Button title="Submit" onPress={onSubmit} /> */}
      <Button title="Submit" onPress={handleSubmit(onSubmit, onErrors)} />
    </View>
  )
}

export const NewProfile = () => {
  const { stagedProfile, updateStagedProfile, register } = useProfileStore()
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [['email'], ['firstName', 'lastName'], ['userName'], ['image']]

  const nextStep = async (formValues) => {
    const index = ref.current?.getCurrentIndex()
    const updated = updateStagedProfile(formValues)

    if (index < data.length - 1) {
      // Valid?
      ref.current?.next()
    } else {
      // Create a new profile
      // submit()

      console.log('Completely done onboarding', updated, stagedProfile)

      try {
        const { userName } = await register()

        router.push(`/user/${userName}`)
      } catch (error) {
        console.error('Nope', error)
      }
    }
  }

  const renderItem = ({ item, index }) => (
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
