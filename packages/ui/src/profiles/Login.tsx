import { useState } from 'react'
import { Magic } from '@magic-sdk/react-native-expo'
import { Form } from 'tamagui'
import { FormFieldWithIcon } from '../inputs/FormFieldWithIcon'

// must use a Dedicated Wallet API Key

export const EmailLogin = () => {
  const [email, setEmail] = useState('')

  const magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY as string)

  // log in a user by their email

  const login = async () => {
    try {
      await magic.auth.loginWithMagicLink({ email: 'hello@example.com' })
    } catch {
      // Handle errors if required!
    }
  }

  // // log in a user by their email, without showing an out-of-the box UI.

  // try {
  //   await magic.auth.loginWithMagicLink({ email: 'hello@example.com', showUI: false })
  // } catch {
  //   // Handle errors if required!
  // }

  return (
    <Form onSubmit={login}>
      <FormFieldWithIcon onChange={setEmail} type="email" id="email" placeholder="Email" />
    </Form>
  )
}
