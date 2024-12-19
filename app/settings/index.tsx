import { SettingsScreen } from '@/features/settings/screen'
import { Stack } from 'expo-router'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
      <SettingsScreen />
    </>
  )
}
