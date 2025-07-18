import { Magic } from '@magic-sdk/react-native-expo'
import { Web3Provider } from '@ethersproject/providers'
import { SIWESigner } from '@canvas-js/signer-ethereum'

if (!process.env.EXPO_PUBLIC_MAGIC_KEY) {
  throw new Error('EXPO_PUBLIC_MAGIC_KEY is not set')
}

export const getCurrentSessionSignerFromMagic = async () => {
  const provider = new Web3Provider(magic.rpcProvider as any)
  const signer = provider.getSigner()

  return new SIWESigner({ signer })
}

export const magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY)

export const getSessionSignerFromSMS = async (phoneNumber: string) => {
  await magic.auth.loginWithSMS({ phoneNumber })

  const userInfo = await magic.user.getInfo()

  if (!userInfo.publicAddress) throw new Error('internal error: magic did not assign an address')

  if (!magic) throw new Error('Could not instantiate Magic')
  return getCurrentSessionSignerFromMagic()
}
