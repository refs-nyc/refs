import React from 'react'
import { Heading } from './typo/Heading'
import { XStack, YStack } from './core/Stacks'
import { View } from 'react-native'
import { useItemStore } from '@/features/pocketbase'
import { ExampleGrid } from './grid/ExampleGrid'
import { DetailsDemo } from './display/DetailsDemo'
import { SearchDemo } from './display/SearchDemo'
import { Button } from './buttons/Button'
import { s, c } from '@/features/style/index'

export const OnboardingCarouselItem = ({
  index,
  next,
  onAddItem,
  done,
  children,
}: {
  index: number
  next: () => void
  onAddItem?: () => void
  done: () => void
  children: React.ReactNode
}) => {
  const { items } = useItemStore()

  if (index === 0)
    return (
      <View
        style={{
          flex: 1,
          marginHorizontal: s.$08,
          justifyContent: 'center',
        }}
      >
        <YStack gap={s.$4}>
          <View style={{ height: 100, justifyContent: 'flex-end' }}>
            <Heading tag="h2" style={{ textAlign: 'center' }}>
              This is a grid.{'\n'} {'\n'}{' '}
              <Heading tag="h2normal">
                A mural that makes you, <Heading tag="h2normalitalic">you</Heading>
              </Heading>
            </Heading>
          </View>
          <ExampleGrid />
          <View style={{ height: 100, justifyContent: 'center' }}>{children}</View>
        </YStack>

        <View
          style={{ paddingHorizontal: s.$2, position: 'absolute', bottom: s.$3, width: '100%' }}
        >
          <Button variant="fluid" title="Next" onPress={next} />
        </View>
      </View>
    )

  if (index === 1)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <YStack gap={s.$4}>
          <View style={{ height: 100, justifyContent: 'flex-end' }}>
            <Heading tag="h2normal" style={{ textAlign: 'center' }}>
              <Heading tag="h2">Fill your grid</Heading> with links, photos, hobbies, places.
            </Heading>
          </View>
          <DetailsDemo />
          <View style={{ height: 100, justifyContent: 'center' }}>{children}</View>
        </YStack>

        <View
          style={{ paddingHorizontal: s.$2, position: 'absolute', bottom: s.$3, width: '100%' }}
        >
          <Button variant="fluid" title="Next" onPress={next} />
        </View>
      </View>
    )

  if (index === 2)
    return (
      <View
        style={{
          flex: 1,
          marginHorizontal: s.$08,
          justifyContent: 'center',
        }}
      >
        <YStack gap={s.$4}>
          <View style={{ height: 100, justifyContent: 'flex-end' }}>
            <Heading tag="h2normal" style={{ textAlign: 'center' }}>
              ...then <Heading tag="h2">find people</Heading> based on the{'\n'}refs they add
            </Heading>
          </View>
          <SearchDemo />
          <View style={{ height: 100, justifyContent: 'center' }}>{children}</View>
        </YStack>

        <View
          style={{ paddingHorizontal: s.$2, position: 'absolute', bottom: s.$3, width: '100%' }}
        >
          <Button variant="fluid" title="I'm ready" onPress={done} />
        </View>
      </View>
    )
}
