import { magic } from '@/features/magic'
import { Button } from '@/ui'
import { Web3Provider } from '@ethersproject/providers'
import { ethers } from 'ethers'
import { SIWESigner } from '@canvas-js/signer-ethereum'
import { useCallback, useState } from 'react'
import { TextInput, View } from 'react-native'

export default function Screen() {
  const [phoneNumber, setPhoneNumber] = useState<string>('')

  const handleLogin = useCallback(async () => {
    const did = await magic.auth.loginWithSMS({ phoneNumber })
    console.log(`did: ${did}, phoneNumber: ${phoneNumber}`)

    const userInfo = await magic.user.getInfo()

    if (!userInfo.publicAddress) throw new Error('internal error: magic did not assign an address')

    if (!magic) throw new Error('Could not instantiate Magic')

    const REFS_TOPIC = 'refs.test'
    const provider = new Web3Provider(magic.rpcProvider as any)
    const signer = provider.getSigner()
    const checksumAddress = ethers.getAddress(userInfo.publicAddress) // checksum-capitalized eth address
    console.log('checksumAddress', checksumAddress)
    const sessionSigner = new SIWESigner({ signer })

    let sessionObject = await sessionSigner.getSession(REFS_TOPIC)
    if (!sessionObject) {
      sessionObject = await sessionSigner.newSession(REFS_TOPIC)
    }
    const session = sessionObject.payload
    console.log('session', session)
  }, [phoneNumber])

  return (
    <>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter phone number"
        />
        <Button title="Login" onPress={handleLogin} />
      </View>
      <magic.Relayer />
    </>
  )
}
