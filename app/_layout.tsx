import { install } from 'react-native-quick-crypto'
install()

import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding'
polyfillEncoding()

import eventsource from 'react-native-sse'
import 'event-target-polyfill'
import '@/features/polyfill/custom-event-polyfill'
import 'react-native-get-random-values'
import 'fast-text-encoding'

// For pocketbase
global.EventSource = eventsource

import { pocketbase } from '@/features/pocketbase'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect } from 'react'
import { StatusBar, useColorScheme } from 'react-native'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { DeferredFonts } from '@/ui'
import { c } from '@/features/style'
import * as SystemUI from 'expo-system-ui'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter: require('@/assets/fonts/Inter-Medium.ttf'),
    InterBold: require('@/assets/fonts/Inter-Bold.ttf'),
  })

  function loadRemainingFonts() {}

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.surface)
    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()

      // Check if the user is already logged in
      console.log(pocketbase.authStore.isValid)
      if (pocketbase.authStore.isValid) {
        console.log('user is logged in')
      }

      loadRemainingFonts()
    }
  }, [interLoaded, interError])

  if (!interLoaded && !interError) {
    return null
  }

  return (
    <Providers>
      <RootLayoutNav />
      {interLoaded && <DeferredFonts />}
    </Providers>
  )
}

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView>{children}</GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: c.surface },
        }}
      />
    </ThemeProvider>
  )
}
