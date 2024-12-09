import { useRef, useState, useEffect } from 'react'
import { Form, View, YStack, H2 } from 'tamagui'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'
import { AvatarPicker } from '../inputs/AvatarPicker'
import { MainButton } from '../buttons/Button'
import { Dimensions } from 'react-native'

import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

export const NewProfile = () => {
  const ref = useRef<ICarouselInstance>(null)

  const win = Dimensions.get('window')

  const data = [['firstName', 'lastName', 'email', 'phone'], ['userName'], ['avatar']]

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    userName: '',
    avatar: null,
  })

  const submit = () => {
    console.log('SUBMIT')
  }

  const nextStep = (index) => {
    console.log(index, ref.current.getCurrentIndex() + 1)
    // Validate fields

    if (index < data.length - 1) {
      ref.current?.next()
    } else {
      submit()
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }))
  }

  useEffect(() => {
    console.log(formData)
  }, [formData])

  const renderItem = ({ item, index }) => {
    return (
      <>
        <View style={{ flex: 1 }} mx="$6" my="$4">
          <YStack gap="$4" pt="$12" pb="$8">
            <H2 ta="center" col="$color12">
              {index === 0 && 'Let us know who you are to wrap up'}
              {index === 1 && 'Choose a username'}
              {index === 2 && '...and upload a profile photo'}
            </H2>
          </YStack>
          <Form onSubmit={() => nextStep(index)}>
            <YStack gap="$6">
              {item.includes('firstName') && (
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
              )}
              {item.includes('email') && (
                <FormFieldWithIcon
                  onChange={(value) => handleInputChange('email', value)}
                  type="email"
                  id="email"
                  placeholder="Email"
                />
              )}
              {item.includes('phone') && (
                <FormFieldWithIcon
                  onChange={(value) => handleInputChange('phone', value)}
                  type="phone"
                  id="phone"
                  placeholder="Phone number"
                />
              )}
              {item.includes('userName') && (
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
              )}
            </YStack>

            <Form.Trigger asChild disabled={false}>
              <MainButton>Looks good</MainButton>
            </Form.Trigger>
          </Form>
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
