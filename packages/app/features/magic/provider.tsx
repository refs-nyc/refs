import React from 'react'
import { Magic } from '@magic-sdk/react-native-expo'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY)

export function MagicProvider({ children }) {
  return (
    <>
      <SafeAreaProvider>
        {/* Render the Magic iframe! */}
        <magic.Relayer />
        {children}
      </SafeAreaProvider>
    </>
  )
}
