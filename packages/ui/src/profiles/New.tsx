import { useRef, useState } from "react"
import { Form, View, YStack, H2 } from 'tamagui'
import { FormFieldWithIcon } from "../inputs/FormFieldWithIcon"
import { MainButton } from "../buttons/Button"
import { Dimensions } from "react-native"

import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

export const NewProfile = () => {
  const ref = useRef<ICarouselInstance>(null)

  const win = Dimensions.get('window')

  const data = [["firstName", "lastName", "email", "phone"], ["userName"], ["avatar"]]

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    userName: '',
    avatar: null
  });

  const nextSlide = () => {
    // Validate fields

    ref.current?.scrollTo({
      /**
       * Calculate the difference between the current index and the target index
       * to ensure that the carousel scrolls to the nearest index
       */
      count: ref.current.getCurrentIndex() + 1,
      animated: true,
    })
  }

  const handleInputChange = (field, value) => {
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
  };

  const renderItem = ({item, index}) => {
    return <>
      <View style={{ flex: 1 }} mx="$6" my="$4">
      <YStack gap="$4" pt="$12" pb="$8">
        <H2 ta="center" col="$color12">
          {index === 0 && "Let us know who you are to wrap up"}
          {index === 1 && "Choose a username"}
          {index === 2 && "...and upload a profile photo"}
        </H2>
      </YStack>
      <Form onSubmit={nextSlide}>
        <YStack gap="$6">
        {item.includes("firstName") && <FormFieldWithIcon onChange={(value) => handleInputChange("firstName", value)} type="user" id="firstName" placeholder="First Name"  />}
        {item.includes("lastName") && <FormFieldWithIcon onChange={(value) => handleInputChange("lastName", value)} type="user" id="lastName" placeholder="Last Name"  />}
        {item.includes("email") && <FormFieldWithIcon onChange={(value) => handleInputChange("email", value)} type="email" id="email" placeholder="Email"  />}
        {item.includes("phone") && <FormFieldWithIcon onChange={(value) => handleInputChange("phone", value)} type="phone" id="phone" placeholder="Phone number"  />}
        {item.includes("userName") && <FormFieldWithIcon onChange={(value) => handleInputChange("userName", value)} type="user" id="userName" placeholder="@anything"  />}
      </YStack>
  
      <Form.Trigger asChild disabled={false}>
        <MainButton>
          Looks good
        </MainButton>
      </Form.Trigger>
      </Form>
    </View>
    </>
  }

  return <View style={{ flex: 1 }}>
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
}
