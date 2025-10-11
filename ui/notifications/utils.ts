import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useAppStore } from '@/features/stores'
import { supabase } from '@/features/supabase/client'

function handleRegistrationError(errorMessage: string) {
console.info('[push] registration skipped:', errorMessage)
  return null
}

/**
 * Checks notification permission status and prompts user appropriately
 * - Already has token: Skip (already registered)
 * - undetermined: Show custom sheet, then trigger native prompt
 * - granted: Silently register token
 * - denied: Show sheet directing to iOS settings
 */
export async function promptForNotifications(message: string) {
  const { user, updateUser, setNotificationPromptMessage } = useAppStore.getState()
  
  if (!user) return
  
  // Skip if user already has push token registered
  if (user.pushToken) return
  
  // Check current permission status
  const { status } = await Notifications.getPermissionsAsync()
  
  if (status === 'granted') {
    // Already granted - just register token silently
    try {
      const token = await registerForPushNotificationsAsync()
      if (token) {
        await updateUser({ pushToken: token })
        
        const supabaseClient = supabase.client
        if (supabaseClient) {
          try {
            await supabaseClient
              .from('users')
              .upsert({ id: user.id, push_token: token }, { onConflict: 'id' })
          } catch (error) {
            console.info('Failed to upsert push token in Supabase (non-fatal)', error)
          }
        }
      }
    } catch (error) {
      console.info('Failed to register push notifications', error)
    }
    return
  }
  
  if (status === 'denied') {
    // Show sheet directing to settings
    setNotificationPromptMessage(`denied:${message}`)
    return
  }
  
  // status === 'undetermined' - show our custom prompt
  setNotificationPromptMessage(message)
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      return handleRegistrationError(
        'Permission not granted to get push token for push notification!'
      )
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId
    if (!projectId) {
      return handleRegistrationError('Project ID not found')
    }
    try {
      const pushTokenString = await Notifications.getExpoPushTokenAsync({
        projectId,
      })
      return pushTokenString.data
    } catch (e: unknown) {
      return handleRegistrationError(`${e}`)
    }
  }
}
