import { useState, useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { registerForPushNotificationsAsync } from './utils'
import { useAppStore } from '@/features/stores'
import { supabase } from '@/features/supabase/client'
import { router } from 'expo-router'

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
      } catch (error) {
        console.info('[push] dev token fetch skipped:', error)
      }
    }

    // Only silently register if permissions are already granted
    // Don't prompt automatically - let contextual prompts handle that
    const timeoutId = setTimeout(async () => {
      // Check if permissions are already granted before attempting registration
      const { status } = await Notifications.getPermissionsAsync()
      
      if (status === 'granted') {
        // Silently register token if permissions already granted
        registerForPushNotificationsAsync()
          .then(async (token) => {
            if (!token) {
              return
            }

            setExpoPushToken(token)

            if (!user) {
              return
            }

            try {
              await updateUser({ pushToken: token })
            } catch (error) {
              console.info('Failed to update push token in PocketBase (non-fatal)', error)
            }

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
          })
          .catch((error: any) => {
            console.info('[push] registration promise rejected:', error)
          })
      }
      // If status is 'undetermined' or 'denied', do nothing
      // Let the contextual prompts (messages, interests) handle permission requests

      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification)
      })

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data
        
        // Handle navigation based on notification type
        if (data?.type === 'message:new' && data?.conversationId) {
          // Navigate to the conversation
          router.push(`/messages/${data.conversationId}`)
        } else if ((data?.type === 'ref:copied_from_profile' || data?.type === 'ref:match') && data?.actorUserName) {
          // Navigate to the actor's profile
          router.push(`/user/${data.actorUserName}`)
        } else if (data?.type === 'community:joined' && data?.conversationId) {
          // Navigate to the group chat
          router.push(`/messages/${data.conversationId}`)
        }
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
