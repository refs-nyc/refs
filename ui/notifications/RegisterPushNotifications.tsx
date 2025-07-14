import { useState, useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { registerForPushNotificationsAsync } from './utils'
import { useAppStore } from '@/features/pocketbase'

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

    registerForPushNotificationsAsync()
      .then(async (token) => {
        setExpoPushToken(token ?? '')
        // Only update user if we still have a logged in user
        if (user && token) {
          await updateUser({ pushToken: token })
        }
      })
      .catch((error: any) => setExpoPushToken(`${error}`))

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // log the response if we want to
    })

    process.env.NODE_ENV === 'development' && logInformation()

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current)
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [isInitialized, user])

  return <></>
}
