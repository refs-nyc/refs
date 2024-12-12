import { YStack, Heading } from './index'
import { View } from 'react-native'
import { ExampleGrid } from './grid/ExampleGrid'
import { UseCaseDemo } from './display/UseCaseDemo'
import { MainButton } from './buttons/Button'
import { ExampleButtonList } from './atoms/ExpandButtonList'
import { Grid } from './grid/Grid'
import { s, c } from '@/features/style/index'

export const OnboardingCarouselItem = ({
  index,
  next,
  onAddItem,
  done,
}: {
  index: number
  next: () => void
  onAddItem: () => void
  done: () => void
}) => {
  if (index === 0)
    return (
      <View
        style={{
          flex: 1,
          paddingVertical: 100,
          marginHorizontal: s.$1half,
          justifyContent: 'center',
        }}
      >
        <YStack gap={s.$4}>
          <Heading tag="h1" style={{ textAlign: 'center' }}>
            This is your grid. A mural that makes you, you
          </Heading>
          <ExampleGrid />
          <MainButton title="Next" onPress={next} />
        </YStack>
      </View>
    )

  if (index === 1)
    return (
      <View
        style={{
          flex: 1,
          paddingVertical: 100,
          marginHorizontal: s.$1half,
          justifyContent: 'center',
        }}
      >
        <YStack gap={s.$4}>
          <Heading tag="h1" style={{ textAlign: 'center' }}>
            This is your grid. A mural that makes you, you
          </Heading>
          <Grid onAddItem={onAddItem} />
          <MainButton title="Next" onPress={next} />
        </YStack>
      </View>
    )

  if (index === 2)
    return (
      <View
        style={{
          flex: 1,
          paddingVertical: 100,
          marginHorizontal: s.$1half,
          justifyContent: 'center',
        }}
      >
        <YStack gap={s.$4} pt="$12" pb="$8">
          <Heading tag="h1" ta="center" col="$color12">
            ...then find people based on the refs they add
          </Heading>
        </YStack>

        <UseCaseDemo />

        <MainButton title="Next" onPress={next} />
      </View>
    )

  if (index === 3)
    return (
      <View
        style={{
          flex: 1,
          paddingVertical: 100,
          marginHorizontal: s.$1half,
          justifyContent: 'center',
        }}
      >
        <YStack gap={s.$4} pt="$12" pb="$8">
          <Heading tag="h1" ta="center" col="$color12">
            ...and get connected by messaging them, starting a group chat, or saving them to a
            folder.
          </Heading>
        </YStack>

        <ExampleButtonList />

        <MainButton title="I'm ready" onPress={done} />
      </View>
    )
}
