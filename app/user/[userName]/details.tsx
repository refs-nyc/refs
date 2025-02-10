import { UserDetailsScreen } from '@/features/user/detail-screen'
import { Stack, useLocalSearchParams } from 'expo-router'

export default function Screen() {
  const { userName, initialId } = useLocalSearchParams()
  const initialIdParam = typeof initialId === 'string' ? initialId : initialId[0]

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Details',
          // presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false,
        }}
      />
      <UserDetailsScreen userName={userName as string} initialId={initialIdParam} />
    </>
  )
}
