import { useState, useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { registerForPushNotificationsAsync } from './utils'
import { useAppStore } from '@/features/stores'
import { supabase } from '@/features/supabase/client'

export function RegisterPushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('')
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  )
  const notificationListener = useRef<Notifications.EventSubscription>()
  const responseListener = useRef<Notifications.EventSubscription>()

  const { updateUser, user, isInitialized } = useAppStore()

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId

  useEffect(() => {
    // Only register for push notifications if user is logged in and initialized
    if (!isInitialized || !user) {
      return
    }

    const logInformation = async () => {
      const { data: pushTokenString } = await Notifications.getExpoPushTokenAsync({ projectId })
    }

    // Delay push notification registration to prioritize UI responsiveness
    const timeoutId = setTimeout(() => {
      registerForPushNotificationsAsync()
        .then(async (token) => {
          const normalizedToken = token ?? ''
          setExpoPushToken(normalizedToken)

          if (!user) {
            return
          }

          try {
            await updateUser({ pushToken: normalizedToken })
          } catch (error) {
            console.warn('Failed to update push token in PocketBase', error)
          }

          const supabaseClient = supabase.client
          if (supabaseClient) {
            try {
              await supabaseClient
                .from('users')
                .upsert(
                  { id: user.id, push_token: normalizedToken || null },
                  { onConflict: 'id' },
                )
            } catch (error) {
              console.warn('Failed to upsert push token in Supabase', error)
            }
          }
        })
        .catch((error: any) => setExpoPushToken(`${error}`))

      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification)
      })

      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
        // no-op for now
      })

      process.env.NODE_ENV === 'development' && logInformation()
    }, 3000) // Delay by 3 seconds to prioritize UI responsiveness

    return () => {
      clearTimeout(timeoutId)
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current)
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [isInitialized, user])

  return <></>
}
