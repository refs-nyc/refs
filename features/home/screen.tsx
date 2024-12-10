import { MainButton, View, YStack, H2 } from '@/ui'
import { router } from 'expo-router'

import 'event-target-polyfill'
import 'fast-text-encoding'

export function HomeScreen({ pagesMode = false }: { pagesMode?: boolean }) {
  const linkTarget = pagesMode ? '/pages-example-user' : '/user'

  return (
    <View px="$4" py="$4" bg="$color.surface" height="100%">
      <YStack gap="$4" pt="$20" pb="$16">
        <H2 ta="center" col="$color12">
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
