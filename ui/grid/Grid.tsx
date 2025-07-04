import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridItem } from './GridItem'
import { GridTileWrapper } from './GridTileWrapper'
import { GridTileActionAdd } from './GridTileActionAdd'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useState } from 'react'
import { Text } from 'react-native'

const PROMPTS = [
  'All-time comfort game',
  'Link you shared recently',
  'Song that always hits',
  'Free space',
  'Place you feel like yourself',
  'Example of perfect design',
  'Hobby you want to get into',
  'Favorite piece from a museum',
  'Most rewatched movie',
  'Tradition you love',
  'Meme slot',
  'Neighborhood spot',
  'Art that moved you',
]

export const Grid = ({
  onPressItem,
  onLongPressItem,
  onAddItem,
  onAddItemWithPrompt,
  onRemoveItem,
  columns = 3,
  rows = 3,
  items,
  editingRights = false,
}: {
  onPressItem?: (item?: ExpandedItem) => void
  onLongPressItem?: () => void
  onAddItem?: () => void
  onAddItemWithPrompt?: (prompt: string) => void
  onRemoveItem?: (item: ExpandedItem) => void
  columns: number
  rows: number
  items: any[]
  editingRights?: boolean
}) => {
  const gridSize = columns * rows

  return (
    <GridWrapper columns={columns} rows={rows}>
      {items.map((item, i) => (
        <GridTileWrapper
          key={item.id}
          id={item.id}
          onPress={() => onPressItem && onPressItem(item)}
          onLongPress={onLongPressItem}
          onRemove={() => {
            if (onRemoveItem) onRemoveItem(item)
          }}
          type={item.list ? 'list' : item.expand.ref?.image || item.image ? 'image' : 'text'}
        >
          <GridItem item={item} i={i} />
        </GridTileWrapper>
      ))}

      {/* Prompt placeholders for empty slots */}
      {Array.from({ length: gridSize - items.length }).map((_, i) => {
        const prompt = PROMPTS[i % PROMPTS.length]
        return (
          <GridTileWrapper
            key={`placeholder-${i}`}
            type="placeholder"
            onPress={() => onAddItemWithPrompt && onAddItemWithPrompt(prompt)}
          >
            <Text style={{ fontSize: 14 }}>{prompt}</Text>
          </GridTileWrapper>
        )
      })}
    </GridWrapper>
  )
}
