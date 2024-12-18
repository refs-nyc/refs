import { useEffect } from 'react'
import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridItem } from './GridItem'
import { GridTileActionAdd } from './GridTileActionAdd'

export const Grid = ({
  onAddItem,
  columns = 3,
  rows = 3,
  items,
  canAdd = true,
}: {
  onAddItem?: () => void
  columns: number
  rows: number
  items: any[]
  canAdd?: boolean
}) => {
  useEffect(() => {
    console.log('items updated', items.length)

    items.forEach((itm) => console.log(itm.expand.ref.title))
  }, [items])

  const gridSize = columns * rows

  return (
    <GridWrapper columns={columns} rows={rows}>
      {items.map((item, i) => (
        <GridItem type={item?.image ? 'image' : 'text'} item={item} i={i} />
      ))}

      {canAdd && <>{items.length < gridSize && <GridItem type={'add'} onPress={onAddItem} />}</>}

      {Array.from({ length: gridSize - items.length - (canAdd ? 1 : 0) }).map((_, i) => (
        <GridTile key={i} />
      ))}
    </GridWrapper>
  )
}
