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
}: {
  onAddItem?: () => void
  columns: number
  rows: number
  items: any[]
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
            <GridTileImage source={item.image} />
          ) : (
            <GridTile borderColor="black" key={item.id}>
              <Text style={{ textAlign: 'center' }}>{item.expand.ref.title}</Text>
            </GridTile>
          )}
        </>
      ))}
      {/* Determine if this is your grid or nah? */}
      {items.length < gridSize && <GridTileActionAdd onAddPress={onAddItem} />}
      {Array.from({ length: gridSize - items.length - 1 }).map((_, i) => (
        <GridTile key={i} />
      ))}
    </GridWrapper>
  )
}
