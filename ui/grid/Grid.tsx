import { useEffect } from 'react'
import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridItem } from './GridItem'
import { GridTileWrapper } from './GridTileWrapper'
import { GridTileActionAdd } from './GridTileActionAdd'

export const Grid = ({
  onAddItem,
  onRemoveItem,
  columns = 3,
  rows = 3,
  items,
  canAdd = true,
}: {
  onAddItem?: () => void
  onRemoveItem?: (id: string) => void
  columns: number
  rows: number
  items: any[]
  canAdd?: boolean
}) => {
  useEffect(() => {
    console.log('items updated', items.length)
  }, [items])

  const gridSize = columns * rows

  return (
    <GridWrapper columns={columns} rows={rows}>
      {items.map((item, i) => (
        <GridTileWrapper
          key={item.id}
          id={item.id}
          index={i}
          canEdit={true}
          onRemove={() => {
            if (onRemoveItem) onRemoveItem(item.id)
          }}
          type={item?.image ? 'image' : 'text'}
        >
          <GridItem item={item} i={i} />
        </GridTileWrapper>
      ))}

      {canAdd && (
        <>
          {items.length < gridSize && (
            <GridTileWrapper canEdit={false} key="add" type="add">
              <GridTileActionAdd onPress={onAddItem}></GridTileActionAdd>
            </GridTileWrapper>
          )}
        </>
      )}

      {Array.from({ length: gridSize - items.length - (canAdd ? 1 : 0) }).map((_, i) => (
        <GridTileWrapper canEdit={false} key={`empty-${i}`} type="">
          <GridTile key={i} />
        </GridTileWrapper>
      ))}
    </GridWrapper>
  )
}
