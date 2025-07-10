import { Magic } from '@magic-sdk/react-native-expo'

if (!process.env.EXPO_PUBLIC_MAGIC_KEY) {
  throw new Error('EXPO_PUBLIC_MAGIC_KEY is not set')
}

export const magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY)
