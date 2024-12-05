import { useEffect } from 'react'
import { YStack, View, Text, styled, XStack } from 'tamagui'
import { GridTile } from './GridTile'
import { GridTileActionAdd } from './GridTileActionAdd'

export const Grid = styled(
  ({ onAddItem }: { onAddItem?: () => void }) => {
    const itemRows = []
    let rows = itemRows ? chunk(itemRows, 3) : []

    // useEffect(() => {
    //   rows = itemRows ? chunk(itemRows, 3) : []
    // }, [itemRows])

    return (
      <YStack gap="$2">
        {rows.map((row, rowIndex) => (
          <XStack key={rowIndex} gap="$2">
            {row.map((item) => (
              <GridTile key={item.id}>
                <Text>{item.id}</Text>
              </GridTile>
            ))}
            {/* Fill remaining space in last row with empty tiles */}
            {rowIndex === rows.length - 1 && row.length < 3 && (
              <>
                {/* Add button in first empty slot */}
                <GridTile>
                  <GridTileActionAdd onAddPress={onAddItem} />
                </GridTile>
                {/* Fill remaining slots if any */}
                {Array(2 - (row.length % 3))
                  .fill(0)
                  .map((_, i) => (
                    <GridTile key={`empty-${i}`} />
                  ))}
              </>
            )}
          </XStack>
        ))}
        {/* If no items, show initial row with add button */}
        {(!itemRows || itemRows.length === 0) && (
          <XStack gap="$2">
            <GridTile>
              <GridTileActionAdd onAddPress={onAddItem} />
            </GridTile>
            <GridTile />
            <GridTile />
          </XStack>
        )}
      </YStack>
    )
  },
  {
    name: 'Grid',
  }
)

// Helper function to split array into chunks
function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  )
}
