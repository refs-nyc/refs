import { useState, useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { registerForPushNotificationsAsync } from './utils'
import { useAppStore } from '@/features/stores'

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
      try {
        await Notifications.getExpoPushTokenAsync({ projectId })
      } catch (error: any) {
        const message = typeof error?.message === 'string' ? error.message : `${error}`
        if (message?.includes('503')) {
          console.warn('Expo push service temporarily unavailable (dev log)')
        } else {
          console.warn('Failed to fetch dev push token', message)
        }
      }
    }

    // Delay push notification registration to prioritize UI responsiveness
    const timeoutId = setTimeout(() => {
      registerForPushNotificationsAsync()
        .then(async (token) => {
          setExpoPushToken(token ?? '')
          if (user && token) {
            await updateUser({ pushToken: token })
          }
        })
        .catch((error: any) => {
          const message = typeof error?.message === 'string' ? error.message : `${error}`
          if (message?.includes('503')) {
            console.warn('Expo push service temporarily unavailable')
            return
          }
          setExpoPushToken(message)
        })

      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification)
      })

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        // log the response if we want to
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
