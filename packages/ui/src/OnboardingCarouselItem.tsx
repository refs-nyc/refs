import { Button, YStack, H2, styled, View, Text } from 'tamagui'
import { ExampleGrid, Grid, MainButton } from '@my/ui'

export const OnboardingCarouselItem = styled(
  ({ index, next, onAddItem }: { index: number; next: () => void; onAddItem: () => void }) => {
    console.log(index, next, onAddItem)

    if (index === 0)
      return (
        <View style={{ flex: 1 }} mx="$6" my="$4">
          <YStack gap="$4" pt="$12" pb="$8">
            <H2 ta="center" col="$color12">
              This is your grid. A mural that makes you, you
            </H2>
          </YStack>

          <ExampleGrid />

          <MainButton onPress={next}>Next</MainButton>
        </View>
      )

    if (index === 1)
      return (
        <View style={{ flex: 1 }} mx="$6" my="$4">
          <YStack gap="$4" pt="$12" pb="$8">
            <H2 ta="center" col="$color12">
              Fill your grid with links, photos, hobbies, places--
            </H2>
          </YStack>

          <Grid onAddItem={onAddItem} />
        </View>
      )

    if (index === 2)
      return (
        <View style={{ flex: 1 }} mx="$6" my="$4">
          <YStack gap="$4" pt="$12" pb="$8">
            <H2 ta="center" col="$color12">
              ...and search for people based on the refs they add.
            </H2>
          </YStack>

          <Grid onAddItem={onAddItem} />
        </View>
      )

    if (index === 3)
      return (
        <View style={{ flex: 1 }} mx="$6" my="$4">
          <YStack gap="$4" pt="$12" pb="$8">
            <H2 ta="center" col="$color12">
              ...then get le chateaux by messaging them, starting a group chat, or saving them to a
              folder.
            </H2>
          </YStack>

          {/* <Grid onAddItem={onAddItem} /> */}
        </View>
      )
  }
)
