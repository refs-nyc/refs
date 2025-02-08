import { YStack, XStack } from '@/ui'
import { GridTile } from './GridTile'
import { GridTileImage } from './GridTileImage'
import { GridTileList } from './GridTileList'
import { GridItem } from './GridItem'
import { GridWrapper } from './GridWrapper'
import { GridTileWrapper } from './GridTileWrapper'

export const ExampleGrid = () => (
  <GridWrapper columns={3} rows={3}>
    <GridTileWrapper canEdit={false} type="image">
      <GridTileImage source={require('@/assets/1.png')} />
    </GridTileWrapper>
    <GridTileWrapper canEdit={false} type="image">
      <GridTileImage source={require('@/assets/2.png')} />
    </GridTileWrapper>
    <GridTileWrapper canEdit={false} type="image">
      <GridTileImage source={require('@/assets/3.png')} />
    </GridTileWrapper>
    <GridTileWrapper canEdit={false} type="image">
      <GridTileImage source={require('@/assets/4.png')} />
    </GridTileWrapper>
    <GridTileWrapper canEdit={false} type="text">
      <GridItem item={{ expand: { ref: { title: 'chinatown dumpling tier list' } } }} i={0} />
      {/* <GridTileList title="chinatown dumpling tier list" /> */}
    </GridTileWrapper>
    <GridTileWrapper canEdit={false} type="image">
      <GridTileImage source={require('@/assets/6.png')} />
    </GridTileWrapper>
    <GridTileWrapper canEdit={false} type="image">
      <GridTileImage source={require('@/assets/7.png')} />
    </GridTileWrapper>
    <GridTileWrapper canEdit={false} type="image">
      <GridTileImage source={require('@/assets/8.png')} />
    </GridTileWrapper>
    <GridTileWrapper canEdit={false} type="text">
      <GridItem item={{ expand: { ref: { title: '2025 reading list' } } }} i={0} />
    </GridTileWrapper>
  </GridWrapper>
)
