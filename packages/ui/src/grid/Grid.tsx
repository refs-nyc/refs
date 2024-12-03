import { YStack, View, Text, styled, XStack } from 'tamagui'
import { GridTile, GridTileActionAdd } from '@my/ui'

export const Grid = styled(
  ({ onAddItem }: { onAddItem?: () => void }) => {
    return (
      <YStack gap="$2">
        <XStack gap="$2">
          <GridTile>
            <GridTileActionAdd onAddPress={onAddItem} />
          </GridTile>
          <GridTile>
            <GridTileActionAdd onAddPress={onAddItem} />
          </GridTile>
          <GridTile>
            <GridTileActionAdd onAddPress={onAddItem} />
          </GridTile>
        </XStack>
        <XStack gap="$2">
          <GridTile />
          <GridTile />
          <GridTile />
        </XStack>
        <XStack gap="$2">
          <GridTile />
          <GridTile />
          <GridTile />
        </XStack>
      </YStack>
    )
  },
  {
    name: 'Grid',
  }
)
