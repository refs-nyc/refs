import { YStack, XStack } from '@/ui'
import { GridTile } from './GridTile'
import { GridTileImage } from './GridTileImage'
import { GridTileList } from './GridTileList'

export const ExampleGrid = () => (
  <YStack gap="$2">
    <XStack gap="$2">
      <GridTile>
        <GridTileImage source={require('@/assets/1.png')} />
      </GridTile>
      <GridTile>
        <GridTileImage source={require('@/assets/2.png')} />
      </GridTile>
      <GridTile>
        <GridTileImage source={require('@/assets/3.png')} />
      </GridTile>
    </XStack>
    <XStack gap="$2">
      <GridTile>
        <GridTileImage source={require('@/assets/4.png')} />
      </GridTile>
      <GridTileList title="chinatown dumpling tier list" />
      <GridTile>
        <GridTileImage source={require('@/assets/6.png')} />
      </GridTile>
    </XStack>
    <XStack gap="$2">
      <GridTile>
        <GridTileImage source={require('@/assets/7.png')} />
      </GridTile>
      <GridTile>
        <GridTileImage source={require('@/assets/8.png')} />
      </GridTile>
      <GridTileList title="2025 reading list" />
    </XStack>
  </YStack>
)
