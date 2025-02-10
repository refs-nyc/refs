import { install } from 'react-native-quick-crypto'
install()

import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding'
polyfillEncoding()

import eventsource from 'react-native-sse'
import 'event-target-polyfill'
import '@/features/polyfill/custom-event-polyfill'
import 'react-native-get-random-values'
import 'fast-text-encoding'

// Disable strict mode warnings caused by carousel
import { configureReanimatedLogger } from 'react-native-reanimated'
import { ShareIntentProvider } from 'expo-share-intent'
configureReanimatedLogger({ strict: false })

// For pocketbase
// @ts-ignore
global.EventSource = eventsource

import NetInfo from '@react-native-community/netinfo'
import { pocketbase } from '@/features/pocketbase'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect } from 'react'
import { StatusBar, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native'
import { Navigation } from '@/ui/navigation/Navigation'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { DeferredFonts } from '@/ui'
import { c } from '@/features/style'
import * as SystemUI from 'expo-system-ui'
import { RegisterPushNotifications } from '@/ui/notifications/RegisterPushNotifications'
import { Icon } from '@/assets/icomoon/IconFont'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
}

// Notifications setup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter: require('@/assets/fonts/Inter-Medium.ttf'),
    InterBold: require('@/assets/fonts/Inter-Bold.ttf'),
    IcoMoon: require('@/assets/icomoon/fonts/icomoon.ttf'),
  })

  function loadRemainingFonts() {}

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      console.log('Connection type', state.type)
      console.log('Is connected?', state.isConnected)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.surface)

    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()

      // Check if the user is already logged in
      if (pocketbase.authStore.isValid) {
        console.log('user is logged in')
      } else {
        pocketbase.authStore.clear()
        console.log('user is not logged in')
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
    <ShareIntentProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {children}
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ShareIntentProvider>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <RegisterPushNotifications />
      <Navigation />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.surface },
        }}
      />
    </ThemeProvider>
  )
}
