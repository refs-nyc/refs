import { useEffect } from 'react'
import { Text } from 'react-native'
import { Pressable } from 'react-native'
import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridTileImage } from './GridTileImage'
import { GridTileActionAdd } from './GridTileActionAdd'
import { useItemStore } from '@/features/canvas/stores'

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
        <>
          {item.image ? (
            <GridTileImage key={`old-${item.id}`} source={item.image} />
          ) : (
            <GridTile borderColor="black" key={`old-${item.id}`}>
              <Text style={{ textAlign: 'center' }}>{item.expand.ref.title}</Text>
            </GridTile>
          )}
        </>
      ))}

      {canAdd && (
        <>{items.length < gridSize && <GridTileActionAdd key={'add'} onAddPress={onAddItem} />}</>
      )}

      {Array.from({ length: gridSize - items.length - (canAdd ? 1 : 0) }).map((_, i) => (
        <GridTile key={i} />
      ))}
    </GridWrapper>
  )
}
