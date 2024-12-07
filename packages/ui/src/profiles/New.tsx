import { Form, View, YStack, H2 } from 'tamagui'
import { FormFieldWithIcon } from "../inputs/FormFieldWithIcon"
import { MainButton } from "../buttons/Button"



export const NewProfile = () => {

  return (<View style={{ flex: 1 }} mx="$6" my="$4">
    <YStack gap="$4" pt="$12" pb="$8">
      <H2 ta="center" col="$color12">
        Let us know who you are to wrap up
      </H2>
    </YStack>
    <Form>
      <YStack gap="$6">
      <FormFieldWithIcon type="user" id="firstName" placeholder="First Name"  />
      <FormFieldWithIcon type="user" id="lastName" placeholder="Last Name"  />
      <FormFieldWithIcon type="email" id="email" placeholder="Email"  />
      <FormFieldWithIcon type="phone" id="phone" placeholder="Phone number"  />
    </YStack>

    <Form.Trigger asChild disabled={false}>
      <MainButton>Looks good</MainButton>
    </Form.Trigger>
    </Form>
  </View>)
}
