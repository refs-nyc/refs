import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { s } from '@/features/style'
import { GridItem } from '@/ui/grid/GridItem'
import { GridTile } from '@/ui/grid/GridTile'
import { GridTileWrapper } from '@/ui/grid/GridTileWrapper'
import { GridWrapper } from '@/ui/grid/GridWrapper'
import { View } from 'react-native'

export const AddRefSheetGrid = ({
  gridItems,
  onSelectItem,
}: {
  gridItems: ExpandedItem[]
  onSelectItem: (item: ExpandedItem) => void
}) => {
  const tileSize = s.$8

  return (
    <View>
      <GridWrapper cellGap={s.$05} columns={3} rows={4}>
        {gridItems.map((item, i) => (
          <GridTileWrapper
            key={item.id}
            id={item.id}
            onPress={() => {
              // select this item
              onSelectItem(item)
            }}
            size={tileSize}
            type={item.list ? 'list' : item.expand.ref?.image || item.image ? 'image' : 'text'}
          >
            <GridItem item={item} i={i} />
          </GridTileWrapper>
        ))}

        {Array.from({ length: 12 - gridItems.length }).map((_, i) => (
          <GridTileWrapper size={tileSize} key={`empty-${i}`} type="">
            <GridTile key={i} />
          </GridTileWrapper>
        ))}
      </GridWrapper>
    </View>
  )
}
