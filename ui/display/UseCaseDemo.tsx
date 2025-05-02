import { View } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { Heading } from '../typo/Heading'
import { Image } from 'expo-image'
import { s, c } from '@/features/style'

export const UseCaseDemo = () => {
  return (
    <View
      style={{
        aspectRatio: 1,
        backgroundColor: c.surface2,
        borderRadius: s.$075,
        justifyContent: 'center',
      }}
    >
      <YStack style={{ justifyContent: 'center', alignItems: 'center' }} gap={s.$2}>
        <XStack
          style={{ paddingHorizontal: s.$1, justifyContent: 'flex-start', width: '100%' }}
          gap={s.$1}
        >
          <Image style={{ width: 54, height: 54 }} source={require('@/assets/l11.png')}></Image>
          <View style={{ justifyContent: 'center' }}>
            {/* @ts-ignore */}
            <Heading tag="h4">Start a book club with people{'\n'}who read the same essay</Heading>
          </View>
        </XStack>
        <XStack
          style={{ paddingHorizontal: s.$1, justifyContent: 'flex-start', width: '100%' }}
          gap={s.$1}
        >
          <Image style={{ width: 54, height: 54 }} source={require('@/assets/l2.png')}></Image>
          <View style={{ justifyContent: 'center' }}>
            {/* @ts-ignore */}
            <Heading tag="h4">
              Find someone who loves cooking{'\n'}and rock climbs at the same gym
            </Heading>
          </View>
        </XStack>
        <XStack
          style={{ paddingHorizontal: s.$1, justifyContent: 'flex-start', width: '100%' }}
          gap={s.$1}
        >
          <Image style={{ width: 54, height: 54 }} source={require('@/assets/l3.png')}></Image>
          <View style={{ justifyContent: 'center' }}>
            {/* @ts-ignore */}
            <Heading tag="h4">Start a book club with people who{'\n'}read the same essay</Heading>
          </View>
        </XStack>
      </YStack>
    </View>
  )
}
