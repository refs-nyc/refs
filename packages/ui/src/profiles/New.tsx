import { useRef, useState, useEffect } from 'react'
import { Form, View, YStack, H2, Paragraph } from 'tamagui'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { AvatarPicker } from '../inputs/AvatarPicker'
import { Button, Dimensions } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

type Inputs = {
  email: string
  firstName: string
  lastName: string
  phone: string
  userName: string
  avatar: string
}

export const NewProfile = () => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Inputs>()

  const onSubmit = (d) => {
    console.log('WE GOOD')
    nextStep()
  }

  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [['email'], ['firstName', 'lastName'], ['userName'], ['avatar']]
  const formValues = watch()

  const nextStep = () => {
    const index = ref.current?.getCurrentIndex()
    console.log(index)

    // Validate fields

    if (index < data.length - 1) {
      // Valid?
      ref.current?.next()
    } else {
      // submit()
    }
  }

  const renderItem = ({ item, index }) => {
    return (
      <>
        <View style={{ flex: 1 }} mx="$6" my="$4">
          <YStack gap="$4" pt="$12" pb="$8">
            <H2 ta="center" col="$color12">
              {index === 0 && 'Login using your email'}
              {index === 1 && 'Let us know who you are to wrap up'}
              {index === 2 && 'Choose a username'}
              {index === 3 && '...and upload a profile photo'}
            </H2>
          </YStack>

          <Form onSubmit={handleSubmit(onSubmit)}>
            <YStack gap="$6">
              {/* {item.includes('firstName') && (
                <FormFieldWithIcon
                  onChange={(value) => handleInputChange('firstName', value)}
                  type="user"
                  id="firstName"
                  placeholder="First Name"
                />
              )}
              {item.includes('lastName') && (
                <FormFieldWithIcon
                  onChange={(value) => handleInputChange('lastName', value)}
                  type="user"
                  id="lastName"
                  placeholder="Last Name"
                />
              )} */}
              {item.includes('email') && (
                <>
                  <Controller
                    name="email"
                    control={control}
                    rules={{ required: true, pattern: /^[^@]+@[^@]+.[^@]+$/ }}
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
                  {errors.email && <Paragraph>This field is required</Paragraph>}
                </>
              )}
              {/* {item.includes('phone') && (
                <FormFieldWithIcon
                  onChange={(value) => handleInputChange('phone', value)}
                  type="phone"
                  id="phone"
                  placeholder="Phone number"
                />
              )} */}
              {/* {item.includes('userName') && (
                <FormFieldWithIcon
                  onChange={(value) => handleInputChange('userName', value)}
                  type="user"
                  id="userName"
                  placeholder="@anything"
                />
              )}
              {item.includes('avatar') && (
                <AvatarPicker
                  onComplete={(value) => handleInputChange('avatar', value)}
                  id="avatar"
                />
              )} */}
            </YStack>
          </Form>
          <Button title="Submit" onPress={handleSubmit(onSubmit)} />
        </View>
      </>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Carousel
        loop={false}
        ref={ref}
        data={data}
        width={win.width}
        height={win.height}
        enabled={true}
        renderItem={renderItem}
      />
    </View>
  )
}
