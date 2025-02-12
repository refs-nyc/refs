import { Heading } from './typo/Heading'
import { XStack, YStack } from './core/Stacks'
import { View } from 'react-native'
import { useItemStore } from '@/features/pocketbase'
import { ExampleGrid } from './grid/ExampleGrid'
import { UseCaseDemo } from './display/UseCaseDemo'
import { Button } from './buttons/Button'
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
              This is your grid.{'\n'} {'\n'}{' '}
              <Heading tag="h2normal">
                A mural that makes you, <Heading tag="h2normalitalic">you</Heading>
              </Heading>
            </Heading>
          </View>
          <ExampleGrid />
          <YStack style={{ paddingVertical: s.$4, flex: 1 }}>
            <XStack gap={s.$1} style={{ width: '100%', justifyContent: 'center' }}>
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.muted,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
            </XStack>
          </YStack>
        </YStack>

        <Button
          style={{ position: 'absolute', bottom: s.$3 }}
          variant="fluid"
          title="next"
          onPress={next}
        />
      </View>
    )

  if (index === 1)
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
              <Heading tag="h2">Fill your grid</Heading> with links, photos, hobbies, places
            </Heading>
          </View>
          <Grid items={items} onAddItem={onAddItem} columns={3} rows={3} />
          <YStack style={{ paddingVertical: s.$4, flex: 1 }}>
            <XStack gap={s.$1} style={{ width: '100%', justifyContent: 'center' }}>
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.muted,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
            </XStack>
          </YStack>
        </YStack>
        <Button
          style={{ position: 'absolute', bottom: s.$3 }}
          variant="fluid"
          title="next"
          onPress={next}
        />
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
          <UseCaseDemo />
          <YStack style={{ paddingVertical: s.$4, flex: 1 }}>
            <XStack gap={s.$1} style={{ width: '100%', justifyContent: 'center' }}>
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.muted,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
              <View
                style={{
                  width: s.$075,
                  height: s.$075,
                  borderRadius: s.$075 / 2,
                  backgroundColor: c.grey1,
                }}
              />
            </XStack>
          </YStack>
        </YStack>
        <Button
          style={{ position: 'absolute', bottom: s.$3 }}
          variant="fluid"
          title="next"
          onPress={next}
        />
      </View>
    )

  if (index === 3)
    return (
      <View
        style={{
          flex: 1,
          marginHorizontal: s.$075,
          justifyContent: 'center',
        }}
      >
        <YStack gap={s.$4}>
          <Heading tag="h2normal" style={{ textAlign: 'center' }}>
            ...and get connected by <Heading tag="h2">messaging </Heading> them, starting a{' '}
            <Heading tag="h2">group chat</Heading>, or saving them to a{' '}
            <Heading tag="h2">folder</Heading>.
            {/* ...then <Heading tag="h2">find people</Heading> based on the{'\n'}refs they add */}
          </Heading>
          <ExampleButtonList />
          <XStack gap={s.$1} style={{ width: '100%', justifyContent: 'center' }}>
            <View
              style={{
                width: s.$075,
                height: s.$075,
                borderRadius: s.$075 / 2,
                backgroundColor: c.grey1,
              }}
            />
            <View
              style={{
                width: s.$075,
                height: s.$075,
                borderRadius: s.$075 / 2,
                backgroundColor: c.grey1,
              }}
            />
            <View
              style={{
                width: s.$075,
                height: s.$075,
                borderRadius: s.$075 / 2,
                backgroundColor: c.grey1,
              }}
            />
            <View
              style={{
                width: s.$075,
                height: s.$075,
                borderRadius: s.$075 / 2,
                backgroundColor: c.muted,
              }}
            />
          </XStack>
        </YStack>

        <Button
          style={{ position: 'absolute', bottom: s.$4 }}
          variant="fluid"
          title="I'm ready"
          onPress={done}
        />
      </View>
    )
}
