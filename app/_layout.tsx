import { install } from 'react-native-quick-crypto'

import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding'

import 'event-target-polyfill'
import '@/features/polyfill/custom-event-polyfill'
import 'react-native-get-random-values'
import 'fast-text-encoding'

// polyfill AbortSignal
if (!AbortSignal.prototype.throwIfAborted) {
  AbortSignal.prototype.throwIfAborted = function () {
    if (this.aborted) {
      throw new Error('Aborted')
    }
  }
}

// Disable strict mode warnings caused by carousel
import { configureReanimatedLogger } from 'react-native-reanimated'
import { ShareIntentProvider } from 'expo-share-intent'

import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect, useRef } from 'react'
import { StatusBar, useColorScheme } from 'react-native'
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
import { DirectMessageComposer } from '@/features/messaging/DirectMessageComposer'
import { GroupMessageComposer } from '@/features/messaging/GroupMessageComposer'
import { useAppStore } from '@/features/stores'
import { DirectoryKeepAlive } from '@/ui/navigation/DirectoryKeepAlive'

import { LogBox } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import Saves from '@/features/saves/saves-sheet'
import Referencers from '@/ui/profiles/sheets/ReferencersSheet'
import { AddRefSheet } from '@/ui/profiles/sheets/AddRefSheet'
import { NewRefSheet } from '@/ui/profiles/sheets/NewRefSheet'

// TODO: this error keeps getting thrown whenever the app fast reloads in development
// I suspect that pocketbase subscribes to updates and then doesn't unsubscribe when the app is being reloaded
// Ignoring these error messages for now
LogBox.ignoreLogs(['ClientResponseError 404'])

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

// Notifications setup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// Initialize polyfills
install()
polyfillEncoding()
configureReanimatedLogger({ strict: false })

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
  const { init } = useAppStore()

  useEffect(() => {
    // Initialize user store to sync with PocketBase auth - make non-blocking
    init().catch((error) => {
      console.error('Failed to initialize app:', error)
    })
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
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.surface }}>
          <KeyboardProvider>
            <FontProvider>{children}</FontProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ShareIntentProvider>
  )
}

function RootLayoutNav() {
  const savesBottomSheetRef = useRef<BottomSheet>(null)
  const colorScheme = useColorScheme()
  const { referencersBottomSheetRef, addRefSheetRef, newRefSheetRef, setShowLogoutButton } = useAppStore()

  // Ensure logout button is hidden on app startup
  useEffect(() => {
    setShowLogoutButton(false)
  }, [setShowLogoutButton])

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <RegisterPushNotifications />
      <MessagesInit />
      <Navigation savesBottomSheetRef={savesBottomSheetRef} />
      {/* Keep directory mounted to preserve images and scroll state across navigations */}
      <DirectoryKeepAlive />

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
            animation: 'none',
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
      </Stack>
      <Saves savesBottomSheetRef={savesBottomSheetRef} />
      {/* list of people who added this ref */}
      <Referencers referencersBottomSheetRef={referencersBottomSheetRef} />
      {/* add ref sheet */}
      <AddRefSheet bottomSheetRef={addRefSheetRef} />
      {/* new ref sheet */}
      <NewRefSheet bottomSheetRef={newRefSheetRef} />
      <DirectMessageComposer />
      <GroupMessageComposer />
    </ThemeProvider>
  )
}
