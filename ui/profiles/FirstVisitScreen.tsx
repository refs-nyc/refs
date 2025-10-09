import { useState } from 'react'
import { YStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import { Switch, View } from 'react-native'
import { router } from 'expo-router'
import { registerForPushNotificationsAsync } from '@/ui/notifications/utils'
import { s, c } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { supabase } from '@/features/supabase/client'

export const FirstVisitScreen = () => {
  const { user, updateUser } = useAppStore()

  const [isEnabled, setIsEnabled] = useState(false)
  const toggleSwitch = async () => {
    setIsEnabled((previousState) => !previousState)

    await registerForPushNotificationsAsync()
      .then(async (token) => {
        const normalizedToken = token ?? ''
        await updateUser({ pushToken: normalizedToken })

        const supabaseClient = supabase.client
        if (supabaseClient && user) {
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
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        router.push(user ? `/user/${user.userName}` : '/')
      })
  }

  return (
    <YStack style={{ justifyContent: 'center', alignItems: 'center' }} gap={s.$2}>
      <Heading tag="p" style={{ textAlign: 'center' }}>
        Refs will go live in your city at 1,000 profiles.{'\n'}Click below to get notified once it’s
        launched.
      </Heading>
      <Switch
        trackColor={{ false: c.surface, true: c.accent2 }}
        thumbColor={isEnabled ? c.accent : c.surface2}
        ios_backgroundColor={c.white}
        onValueChange={toggleSwitch}
        value={isEnabled}
      />
      <Heading tag="mutewarn">Push Notifications</Heading>
    </YStack>
  )
}
