import { View } from 'react-native'
import { Button, MainButton, YStack, Heading } from '../../ui/index'
import { router } from 'expo-router'
import { c, s } from '@/features/style/index'

export function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: s.$4,
        height: s.full,
      }}
    >
      <YStack gap={s.$8}>
        <Heading tag="h1normal" style={{ textAlign: 'center', color: c.black }}>
          <Heading tag="strong">Refs</Heading> is the phonebook for the internet.
        </Heading>
        <YStack style={{ alignItems: 'center' }} gap={s.$05}>
          <Button title="Join" onPress={() => router.push('/onboarding')} />
          <Button variant="basic" title="Login" onPress={() => router.push('/user/new')} />
        </YStack>
      </YStack>
    </View>
  )
}
