import { SIWESigner } from '@canvas-js/signer-ethereum'
import { Magic } from '@magic-sdk/react-native-expo'
import { sha256 } from '@noble/hashes/sha2'
import { bytesToHex } from '@noble/hashes/utils'
import { Wallet } from 'ethers'

if (!process.env.EXPO_PUBLIC_MAGIC_KEY) {
  throw new Error('EXPO_PUBLIC_MAGIC_KEY is not set')
}

export const getCurrentSessionSignerFromMagic = async () => {
  const { Web3Provider } = await import('@ethersproject/providers')
  const provider = new Web3Provider(magic.rpcProvider as any)
  const signer = provider.getSigner()

  return new SIWESigner({ signer })
}

export const getEncryptionWalletFromMagic = async () => {
  const { Web3Provider } = await import('@ethersproject/providers')
  const provider = new Web3Provider(magic.rpcProvider as any)
  const signer = provider.getSigner()

  const signature = await signer.signMessage('Secret messaging with Canvas')
  // hash the signature
  const privKey = `0x${bytesToHex(sha256(signature))}`

  // create a keypair from the hash
  return new Wallet(privKey)
}

export const magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY)

export const getSessionSignerFromSMS = async (phoneNumber: string) => {
  await magic.auth.loginWithSMS({ phoneNumber })

  const userInfo = await magic.user.getInfo()

  if (!userInfo.publicAddress) throw new Error('internal error: magic did not assign an address')

  if (!magic) throw new Error('Could not instantiate Magic')
  return getCurrentSessionSignerFromMagic()
}
