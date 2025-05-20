import { router } from 'expo-router'
import { DeviceLocation } from '@/ui/inputs/DeviceLocation'
import { FirstVisitScreen } from '@/ui/profiles/FirstVisitScreen'
import { Button, ScreenWrapper } from '@/ui'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { s } from '@/features/style'

export function SettingsScreen() {
  const { logout, updateUser } = useUserStore()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

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
