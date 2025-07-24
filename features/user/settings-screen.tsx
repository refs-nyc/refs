import { router } from 'expo-router'
import { DeviceLocation } from '@/ui/inputs/DeviceLocation'
import { FirstVisitScreen } from '@/ui/profiles/FirstVisitScreen'
import { Button, ScreenWrapper } from '@/ui'
import { useAppStore } from '@/features/stores'
import { s } from '@/features/style'

export function SettingsScreen() {
  const { logout, updateUserLocation } = useAppStore()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <ScreenWrapper>
      <DeviceLocation
        onChange={async ({ location, lon, lat }) => {
          await updateUserLocation(location)
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
