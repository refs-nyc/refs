import { YStack, styled, XStack } from 'tamagui'
import { GridTile, GridTileActionAdd, GridTileImage, GridTileList } from '@my/ui'

export const ExampleGrid = styled(
  () => (
    <YStack gap="$2">
      <XStack gap="$2">
        <GridTile>{/* <GridTileActionAdd /> */}</GridTile>
        <GridTile>
          <GridTileImage source="https://rogerfederer.com/wp-content/themes/roger-federer-2024/assets/graphics/records-bg-v4.1.1.jpg" />
        </GridTile>
        <GridTile>{/* <GridTileActionAdd /> */}</GridTile>
      </XStack>
      <XStack gap="$2">
        <GridTileList title="Some western films you've never ever seen before" />
        <GridTile />
        <GridTile>
          <GridTileImage source="https://rogerfederer.com/wp-content/themes/roger-federer-2024/assets/graphics/records-bg-v4.1.1.jpg" />
        </GridTile>
      </XStack>
      <XStack gap="$2">
        <GridTile>
          <GridTileImage source="https://rogerfederer.com/wp-content/themes/roger-federer-2024/assets/graphics/records-bg-v4.1.1.jpg" />
        </GridTile>
        <GridTile />
        <GridTileList title="Some western films you've never ever seen before" />
      </XStack>
    </YStack>
  ),
  {
    name: 'ExampleGrid',
  }
)
