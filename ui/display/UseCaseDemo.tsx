import { View } from 'react-native'
import { XStack, YStack, Paragraph } from '@/ui'
import { Image } from 'expo-image'

export const UseCaseDemo = () => {
  return (
    <View style={{ aspectRatio: 1, width: '100%' }} px="$0" bg="$surface-3" borderRadius="$3">
      <YStack flex={1} jc="center" ai="center" gap="$5">
        <XStack gap="$3" jc="flex-start" w="100%" px="$4">
          <Image style={{ width: 54, height: 54 }} source={require('@/assets/l11.png')}></Image>
          <View style={{ justifyContent: 'center' }}>
            <Paragraph size="$2" lh="$0.5">
              Start a book club with people{'\n'}who read the same essay
            </Paragraph>
          </View>
        </XStack>
        <XStack gap="$3" jc="flex-start" w="100%" px="$4">
          <Image style={{ width: 54, height: 54 }} source={require('@/assets/l2.png')}></Image>
          <View style={{ justifyContent: 'center' }}>
            <Paragraph size="$2" lh="$0.5">
              Find someone who loves cooking{'\n'}and rock climbs at the same gym
            </Paragraph>
          </View>
        </XStack>
        <XStack gap="$3" jc="flex-start" w="100%" px="$4">
          <Image style={{ width: 54, height: 54 }} source={require('@/assets/l3.png')}></Image>
          <View style={{ justifyContent: 'center' }}>
            <Paragraph size="$2" lh="$0.5">
              Start a book club with people who{'\n'}read the same essay
            </Paragraph>
          </View>
        </XStack>
      </YStack>
    </View>
  )
}
