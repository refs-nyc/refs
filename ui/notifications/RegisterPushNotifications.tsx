import { useState, useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { registerForPushNotificationsAsync } from './utils'
import { useUserStore } from '@/features/pocketbase/stores/users'

export function RegisterPushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('')
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  )
  const notificationListener = useRef<Notifications.EventSubscription>()
  const responseListener = useRef<Notifications.EventSubscription>()

  const { updateUser } = useUserStore()

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId

  useEffect(() => {
    const logInformation = async () => {
      const { data: pushTokenString } = await Notifications.getExpoPushTokenAsync({ projectId })
      console.log(pushTokenString)
    }

    registerForPushNotificationsAsync()
      .then(async (token) => {
        setExpoPushToken(token ?? '')
        await updateUser({ pushToken: token ?? '' })
      })
      .catch((error: any) => setExpoPushToken(`${error}`))

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log(response)
    })

    process.env.NODE_ENV === 'development' && logInformation()

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(notificationListener.current)
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [])

  return <></>
}
