import { useEffect } from 'react'
import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridItem } from './GridItem'
import { GridTileWrapper } from './GridTileWrapper'
import { GridTileActionAdd } from './GridTileActionAdd'

export const Grid = ({
  onPressItem,
  onLongPressItem,
  onAddItem,
  onRemoveItem,
  columns = 3,
  rows = 3,
  items,
  editingRights = false,
}: {
  onPressItem?: (id?: string) => void
  onLongPressItem?: () => void
  onAddItem?: () => void
  onRemoveItem?: (id: string) => void
  columns: number
  rows: number
  items: any[]
  editingRights?: boolean
}) => {
  useEffect(() => {
    // console.log('grid: items updated', items.length)
  }, [items])
  const gridSize = columns * rows

  return (
    <GridWrapper columns={columns} rows={rows}>
      {items.map((item, i) => (
        <GridTileWrapper
          key={item.id}
          id={item.id}
          onPress={onPressItem}
          onLongPress={onLongPressItem}
          onRemove={() => {
            if (onRemoveItem) onRemoveItem(item.id)
          }}
          type={item.list ? 'list' : item.expand.ref?.image || item.image ? 'image' : 'text'}
        >
          <GridItem item={item} i={i} />
        </GridTileWrapper>
      ))}

      {editingRights && (
        <>
          {items.length < gridSize && (
            <GridTileWrapper key="add" type="add">
              <GridTileActionAdd onPress={onAddItem ?? (() => {})}></GridTileActionAdd>
            </GridTileWrapper>
          )}
        </>
      )}

      {Array.from({ length: gridSize - items.length - (editingRights ? 1 : 0) }).map((_, i) => (
        <GridTileWrapper key={`empty-${i}`} type="">
          <GridTile key={i} />
        </GridTileWrapper>
      ))}
    </GridWrapper>
  )
}
