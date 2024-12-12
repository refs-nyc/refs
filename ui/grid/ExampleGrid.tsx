import { YStack, XStack } from '@/ui'
import { GridTile } from './GridTile'
import { GridTileImage } from './GridTileImage'
import { GridTileList } from './GridTileList'
import { GridWrapper } from './GridWrapper'

export const ExampleGrid = () => (
  <GridWrapper columns={3} rows={3}>
    <GridTileImage source={require('@/assets/1.png')} />
    <GridTileImage source={require('@/assets/2.png')} />
    <GridTileImage source={require('@/assets/3.png')} />
    <GridTileImage source={require('@/assets/4.png')} />
    <GridTileList title="chinatown dumpling tier list" />
    <GridTileImage source={require('@/assets/6.png')} />
    <GridTileImage source={require('@/assets/7.png')} />
    <GridTileImage source={require('@/assets/8.png')} />
    <GridTileList title="2025 reading list" />
  </GridWrapper>
)
