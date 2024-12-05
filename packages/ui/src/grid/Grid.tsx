import { useEffect } from 'react'
import { YStack, View, Text, styled, XStack } from 'tamagui'
import { Pressable } from 'react-native'
import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridTileImage } from './GridTileImage'
import { GridTileActionAdd } from './GridTileActionAdd'
import { useItemStore } from 'app/features/canvas/models'

export const Grid = ({ onAddItem }: { onAddItem?: () => void }) => {
  const { items, push, remove } = useItemStore()

  return (
    <GridWrapper columns={3} rows={4}>
      {items.map((item) => (
        <>
          {item.image && <GridTileImage source={item.image} />}
          {!item?.image && (
            <GridTile>
              <Text ta="center">{item.title}</Text>
            </GridTile>
          )}
        </>
      ))}
      {items.length < 12 && <GridTileActionAdd onAddPress={onAddItem} />}
      {Array.from({ length: 12 - items.length - 1 }).map(() => (
        <GridTile />
      ))}
    </GridWrapper>
  )
}
