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
import { enableFreeze } from 'react-native-screens'
import { ShareIntentProvider } from 'expo-share-intent'

import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect, useRef, useState } from 'react'
import { StatusBar, useColorScheme } from 'react-native'
import { Navigation } from '@/ui/navigation/Navigation'
import { NavigationBackdrop } from '@/ui/navigation/NavigationBackdrop'
import { LogoutSheet } from '@/ui/navigation/LogoutSheet'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { DeferredFonts } from '@/ui'
import { c } from '@/features/style'
import * as SystemUI from 'expo-system-ui'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { QueryClientProvider } from '@tanstack/react-query'

import { RegisterPushNotifications } from '@/ui/notifications/RegisterPushNotifications'
import { DirectMessageComposer } from '@/features/messaging/DirectMessageComposer'
import { GroupMessageComposer } from '@/features/messaging/GroupMessageComposer'
import { useAppStore } from '@/features/stores'
import { GlobalToast } from '@/ui/feedback/Toast'

import { LogBox } from 'react-native'
import BottomSheet from '@gorhom/bottom-sheet'
import Saves from '@/features/saves/saves-sheet'
import Referencers from '@/ui/profiles/sheets/ReferencersSheet'
import { AddRefSheet } from '@/ui/profiles/sheets/AddRefSheet'
import { NewRefSheet } from '@/ui/profiles/sheets/NewRefSheet'
import { ProfileDetailsSheet } from '@/ui/profiles/ProfileDetailsSheet'
import { ProfileSettingsSheet } from '@/ui/profiles/sheets/ProfileSettingsSheet'
import { CommunityFormSheet } from '@/ui/communities/CommunityFormSheet'
import { RemoveInterestSheet } from '@/ui/communities/RemoveInterestSheet'
import { NotificationPromptSheet } from '@/ui/notifications/NotificationPromptSheet'
import { queryClient } from '@/core/queryClient'
import { preloadInitial, startRealtime } from '@/core/preload-controller'
import { seedBootSnapshots } from '@/core/bootstrap/seedSnapshots'
import { patchInteractionManager, startJsQueueMonitor } from '@/core/instrumentation/jsQueueMonitor'
import { enablePerfHarness, markFirstPaint } from '@/core/perf/harness'
import { installBootFetchLogger } from '@/core/boot/bootFetch'

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
enableFreeze(true)

if (__DEV__) {
  patchInteractionManager({ waitWarnMs: 150, runWarnMs: 50 })
  startJsQueueMonitor({ intervalMs: 100, warnAtMs: 200 })
}

const PERF_HARNESS_ENABLED = process.env.EXPO_PUBLIC_PERF_HARNESS === '1'
const OFF_REALTIME = process.env.EXPO_PUBLIC_OFF_REALTIME === '1'
const OFF_AUTH_RESTORE = process.env.EXPO_PUBLIC_OFF_AUTH_RESTORE === '1'
const OFF_ZS_PERSIST = process.env.EXPO_PUBLIC_OFF_ZS_PERSIST === '1'
const OFF_PRELOAD = process.env.EXPO_PUBLIC_OFF_PRELOAD === '1'
const OFF_ANALYTICS = process.env.EXPO_PUBLIC_OFF_ANALYTICS === '1'

if (PERF_HARNESS_ENABLED && !OFF_ANALYTICS) {
  void enablePerfHarness({
    reactQueryClient: queryClient,
    enableRequireProbe: true,
    enableIOTripwires: true,
    enableLagProbe: true,
    verbose: true,
  }).catch((error) => {
    console.warn('[perf] enablePerfHarness failed', error)
  })
}

if (__DEV__) {
  installBootFetchLogger({ windowMs: 5000, capBytes: 1_000_000 })
}

if (PERF_HARNESS_ENABLED && OFF_ANALYTICS) {
  console.log('[boot-trace] perfHarness:skipped (analytics flag)')
}

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
  }, [])

  useEffect(() => {
    if (interLoaded || interError) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [interLoaded, interError])

  // Render immediately; text will fallback to system font until Inter loads.
  return <>{children}</>
}

export default function RootLayout() {
  const { init } = useAppStore()
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    if (!PERF_HARNESS_ENABLED) return
    const handle = requestAnimationFrame(() => {
      markFirstPaint()
    })
    return () => cancelAnimationFrame(handle)
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const startedAt = Date.now()
      console.log('[boot-trace] root.init:start')
      try {
        await init()
        if (cancelled) return

        const { user } = useAppStore.getState()
        if (OFF_ZS_PERSIST) {
          console.log('[boot-trace] seedBootSnapshots:skipped')
        } else {
          try {
            await seedBootSnapshots({ userId: user?.id, userName: user?.userName })
          } catch (error) {
            console.warn('seedBootSnapshots failed', error)
          }
        }
        if (cancelled) return
        setBootstrapped(true)
        console.log('[boot-trace] root.init:completed', Date.now() - startedAt, 'ms')
        if (OFF_PRELOAD) {
          console.log('[boot-trace] preloadInitial:skipped')
        } else {
          void preloadInitial().catch((error) => {
            console.warn('preloadInitial failed', error)
          })
        }
        if (OFF_REALTIME) {
          console.log('[boot-trace] startRealtime:skipped')
        } else {
          console.log('[boot-trace] root.startRealtime')
          startRealtime()
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
        if (!cancelled) {
          setBootstrapped(true)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [init])

  useEffect(() => {
    // Ensure splash hides even if fonts fail to load quickly.
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  return (
    <Providers>
      <QueryClientProvider client={queryClient}>
        {bootstrapped ? <RootLayoutNav /> : null}
        <DeferredFonts />
      </QueryClientProvider>
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
  const { referencersBottomSheetRef, addRefSheetRef, newRefSheetRef, logoutSheetRef } = useAppStore()

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <RegisterPushNotifications />
      <Navigation savesBottomSheetRef={savesBottomSheetRef} />
      <NavigationBackdrop />

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
            presentation: 'card',
            animation: 'none',
            gestureEnabled: false,
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
          name="messages"
          options={{
            title: 'Messages',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
            headerShown: false,
            animationDuration: 300,
          }}
        />
      </Stack>
      <Saves savesBottomSheetRef={savesBottomSheetRef} />
      {/* profile details sheet (media carousel) */}
      <ProfileDetailsSheet />
      {/* list of people who added this ref */}
      <Referencers referencersBottomSheetRef={referencersBottomSheetRef} />
      {/* add ref sheet */}
      <AddRefSheet bottomSheetRef={addRefSheetRef} />
      {/* new ref sheet */}
      <NewRefSheet bottomSheetRef={newRefSheetRef} />
      <LogoutSheet bottomSheetRef={logoutSheetRef} />
      {/* profile settings sheet */}
      <ProfileSettingsSheet />
      {/* community form sheet */}
      <CommunityFormSheet />
      <DirectMessageComposer />
      <GroupMessageComposer />
      <RemoveInterestSheet />
      <NotificationPromptSheet />
      <GlobalToast />
    </ThemeProvider>
  )
}
