import { UserDetailScreen } from '@/features/user/detail-screen'
import { Stack, useLocalSearchParams } from 'expo-router'

export default function Screen() {
  const { id } = useLocalSearchParams()
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
      <UserDetailScreen id={id as string} />
    </>
  )
}
