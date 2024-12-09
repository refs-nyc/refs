import React from 'react'
import { Magic } from '@magic-sdk/react-native-bare'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { createContext, useContext, useEffect, useState } from 'react'

const magic = new Magic(process.env.EXPO_PUBLIC_MAGIC_KEY)

export const MagicContext = createContext(null)

export function useMagicContext() {
  return useContext(MagicContext)
}

export function MagicProvider({ children }) {
  return (
    <MagicContext.Provider value={magic}>
      <SafeAreaProvider>
        {/* Render the Magic iframe! */}
        <magic.Relayer />
        {children}
      </SafeAreaProvider>
    </MagicContext.Provider>
  )
}
