// polyfills
import { install } from 'react-native-quick-crypto'
install()

import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding'
polyfillEncoding()

import 'event-target-polyfill'
import '@/features/polyfill/custom-event-polyfill'

// dependencies
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { MagicProvider } from '@/features/magic/'

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <SafeAreaProvider>
        <MagicProvider>
          <Stack />
        </MagicProvider>
      </SafeAreaProvider>
    </TamaguiProvider>
  )
}
