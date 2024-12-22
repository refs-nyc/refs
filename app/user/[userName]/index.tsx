import { UserProfileScreen } from '@/features/user/profile-screen'
import { Stack, useGlobalSearchParams } from 'expo-router'
import { Text } from 'react-native'

export default function Screen() {
  const { userName } = useGlobalSearchParams()
  console.log('USER PROFILE', userName)
  return (
    <>
      <Stack.Screen
        options={{
          title: 'User',
          // presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false,
        }}
      />
      <UserProfileScreen userName={userName} />
    </>
  )
}
