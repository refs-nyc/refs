import { MainButton } from '@my/ui'
import { useState } from 'react'
import { useMagicContext } from 'app/features/magic-bare/MagicProvider'
import { NewProfile, Profile } from '@my/ui'
import { FormFieldWithIcon } from '@my/ui/src/inputs/FormFieldWithIcon'

export function UserDetailScreen({ id }: { id: string }) {
  const [email, setEmail] = useState('')
  const magic = useMagicContext()

  const login = async () => {
    try {
      await magic.auth.loginWithEmailOTP({ email })
    } catch (error) {
      console.error(error)
    }
  }

  if (!id) {
    return null
  }

  return (
    <>
      <FormFieldWithIcon placeholder="email" id="email" type="email" onChange={setEmail} />
      <MainButton onPress={login}>Log in</MainButton>
    </>
  )
}
