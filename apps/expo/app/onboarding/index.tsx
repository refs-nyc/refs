import { OnboardingScreen } from 'app/features/onboarding/onboarding-screen'
import { Stack } from 'expo-router'

export default function Screen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Onboarding',
          // presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false,
        }}
      />
      <OnboardingScreen />
    </>
  )
}
