// polyfills
import { install } from 'react-native-quick-crypto'
install()

import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding'
polyfillEncoding()

import 'event-target-polyfill'
import './custom-event-polyfill'

// dependencies
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'

import { magic } from './shared'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* Render the Magic iframe! */}
      <magic.Relayer />
      <Stack />
    </SafeAreaProvider>
  )
}
