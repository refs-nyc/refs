import { SettingsScreen } from '@/features/user/settings-screen'
import { Stack } from 'expo-router'
import { useLocalSearchParams } from 'expo-router'

export default function Screen() {
  const { userName } = useLocalSearchParams()
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
      {userName && <SettingsScreen userName={userName} />}
    </>
  )
}
