import { createContext, useContext } from 'react'

import { Magic } from '@magic-sdk/react-native-expo'

export const magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY)
