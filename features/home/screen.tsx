import { MainButton, View, YStack, H2 } from '@/ui'
import { router } from 'expo-router'

export function HomeScreen() {
  return (
    <View
      style={{ flex: 1, justifyContent: 'center', backgroundColor: 'red' }}
      px="$4"
      py="$4"
      bg="$color.surface"
      height="100%"
    >
      <YStack gap="$4" pt="$20" pb="$16">
        <H2 style={{ textAlign: 'center' }} ta="center" col="$color12">
          Refs is the phonebook for the internet.
        </H2>
      </YStack>

      <YStack gap="$4">
        <MainButton title="Join" onPress={() => router.push('/onboarding')} />
        <MainButton title="Login" onPress={() => router.push('/user/new')} />
        <MainButton title="Manus' profile" onPress={() => router.push('/user/Manegame')} />
      </YStack>
    </View>
  )
}
