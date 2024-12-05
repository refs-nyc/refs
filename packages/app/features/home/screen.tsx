import {
  MainButton,
  View,
  Input,
  Paragraph,
  SwitchThemeButton,
  SwitchRouterButton,
  XStack,
  YStack,
  Avatar,
  Text,
  H2,
  Anchor,
} from '@my/ui'
import { useRouter } from 'solito/router'

import 'event-target-polyfill'
import 'fast-text-encoding'

export function HomeScreen({ pagesMode = false }: { pagesMode?: boolean }) {
  const router = useRouter()

  return (
    <View px="$4" py="$4" bg="$color.surface" height="100%">
      <YStack gap="$4" pt="$20" pb="$16">
        <H2 ta="center" col="$color12">
          Refs is the phonebook for the internet.
        </H2>
      </YStack>

      <YStack gap="$4">
        <MainButton onPress={() => router.push('/onboarding')}>Join</MainButton>
        <MainButton secondary onPress={() => router.push('/user/1')}>
          Login
        </MainButton>
      </YStack>
    </View>
  )
}
