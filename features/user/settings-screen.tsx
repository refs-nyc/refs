import { useEffect, useState } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { Profile as ProfileType } from '@/features/pocketbase/stores/types'
import { DeviceLocation } from '@/ui/inputs/DeviceLocation'
import { FirstVisitScreen } from '@/ui/profiles/FirstVisitScreen'
import { Button, ScreenWrapper } from '@/ui'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { s } from '@/features/style'

export function SettingsScreen({ userName }: { userName: string }) {
  const { profile, getProfile, logout, updateUser } = useUserStore()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  useEffect(() => {
    const load = async () => {
      await getProfile(userName)

      // @ts-ignore
      if (!pocketbase.authStore.isValid || pocketbase.authStore?.record?.id !== profile?.id)
        router.push('/')
    }
    load()
  }, [userName])

  return (
    <ScreenWrapper>
      <DeviceLocation
        onChange={async ({ location, lon, lat }) => {
          await updateUser({ location, lon, lat })
        }}
      />

      <FirstVisitScreen />

      <Button
        style={{ marginTop: s.$12, marginBottom: 0 }}
        title="Home"
        variant="basic"
        onPress={() => router.push('/')}
      />
      <Button
        style={{ marginBottom: s.$12 }}
        title="Logout"
        variant="basic"
        onPress={() => handleLogout()}
      />
    </ScreenWrapper>
  )
}
