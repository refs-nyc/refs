import { install } from 'react-native-quick-crypto'

import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding'

import 'event-target-polyfill'
import '@/features/polyfill/custom-event-polyfill'
import 'react-native-get-random-values'
import 'fast-text-encoding'

// Disable strict mode warnings caused by carousel
import { configureReanimatedLogger } from 'react-native-reanimated'
import { ShareIntentProvider } from 'expo-share-intent'

import NetInfo from '@react-native-community/netinfo'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect } from 'react'
import { StatusBar, useColorScheme, useWindowDimensions, View } from 'react-native'
import { Navigation } from '@/ui/navigation/Navigation'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { DeferredFonts } from '@/ui'
import { c } from '@/features/style'
import * as SystemUI from 'expo-system-ui'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { RegisterPushNotifications } from '@/ui/notifications/RegisterPushNotifications'
import { MessagesInit } from '@/features/messaging/message-loader'
import { useUserStore } from '@/features/pocketbase/stores/users'

install()
polyfillEncoding()
configureReanimatedLogger({ strict: false })

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

function FontProvider({ children }: { children: React.ReactNode }) {
  const [interLoaded, interError] = useFonts({
    Inter: require('@/assets/fonts/Inter-Medium.ttf'),
    InterSemiBold: require('@/assets/fonts/Inter-SemiBold.ttf'),
    InterBold: require('@/assets/fonts/Inter-Bold.ttf'),
    IcoMoon: require('@/assets/icomoon/fonts/icomoon.ttf'),
  })

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.surface)

    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()
    }
  }, [interLoaded, interError])

  if (!interLoaded && !interError) {
    return null
  }

  return <>{children}</>
}

export default function RootLayout() {
  const { init } = useUserStore()

  useEffect(() => {
    // Initialize user store to sync with PocketBase auth
    init()

    const unsubscribe = NetInfo.addEventListener((state) => {
      console.log('Connection type', state.type)
      console.log('Is connected?', state.isConnected)
    })

    return unsubscribe
  }, [init])

  return (
    <Providers>
      <RootLayoutNav />
      <DeferredFonts />
    </Providers>
  )
}

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ShareIntentProvider>
      <SafeAreaProvider>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <FontProvider>{children}</FontProvider>
          </KeyboardProvider>
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
      <MessagesInit />
      <Navigation />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.surface },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Refs',
            animation: 'fade_from_bottom',
          }}
        />
        <Stack.Screen
          name="saves/modal"
          options={{
            presentation: 'transparentModal',
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'fade'
          }}
        />
        <Stack.Screen
          name="settings/index"
          options={{
            title: 'Settings',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="onboarding/index"
          options={{
            title: 'Onboarding',
            // presentation: 'modal',
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="user/[userName]/index"
          options={{
            title: 'User',
            // presentation: 'modal',
            animation: 'slide_from_left',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="user/login"
          options={{
            title: 'Login',
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="user/[userName]/modal"
          options={{
            title: 'Details',
            animation: 'none',
          }}
        />
      </Stack>
    </ThemeProvider>
  )
}
