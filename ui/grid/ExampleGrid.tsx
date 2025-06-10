import { GridTileImage } from './GridTileImage'
import { GridItem } from './GridItem'
import { GridWrapper } from './GridWrapper'
import { GridTileWrapper } from './GridTileWrapper'
import { View } from 'react-native'

export const ExampleGrid = () => (
  <View style={{ marginHorizontal: 'auto' }}>
    <GridWrapper columns={3} rows={3}>
      <GridTileWrapper type="image">
        <GridTileImage source={require('@/assets/1.png')} />
      </GridTileWrapper>
      <GridTileWrapper type="image">
        <GridTileImage source={require('@/assets/2.png')} />
      </GridTileWrapper>
      <GridTileWrapper type="image">
        <GridTileImage source={require('@/assets/3.png')} />
      </GridTileWrapper>
      <GridTileWrapper type="image">
        <GridTileImage source={require('@/assets/4.png')} />
      </GridTileWrapper>
      <GridTileWrapper type="text">
        <GridItem item={{ expand: { ref: { title: 'chinatown dumpling tier list' } } }} i={0} />
        {/* <GridTileList title="chinatown dumpling tier list" /> */}
      </GridTileWrapper>
      <GridTileWrapper type="image">
        <GridTileImage source={require('@/assets/6.png')} />
      </GridTileWrapper>
      <GridTileWrapper type="image">
        <GridTileImage source={require('@/assets/7.png')} />
      </GridTileWrapper>
      <GridTileWrapper type="image">
        <GridTileImage source={require('@/assets/8.png')} />
      </GridTileWrapper>
      <GridTileWrapper type="text">
        <GridItem item={{ expand: { ref: { title: '2025 reading list' } } }} i={0} />
      </GridTileWrapper>
    </GridWrapper>
  </View>
)
