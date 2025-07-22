import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridItem } from './GridItem'
import { GridTileWrapper } from './GridTileWrapper'
import { GridTileActionAdd } from './GridTileActionAdd'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useState } from 'react'
import { Text, Dimensions, View } from 'react-native'
import { s } from '@/features/style'

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
  searchMode = false,
  selectedRefs = [],
  setSelectedRefs,
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
  searchMode?: boolean
  selectedRefs?: string[]
  setSelectedRefs?: (ids: string[]) => void
}) => {
  const gridSize = columns * rows
  const screenWidth = Dimensions.get('window').width
  const horizontalPadding = 20 // 10px on each side
  const normalGap = 6 // s.$075 fallback
  const searchGap = 10
  const cellGap = searchMode ? searchGap : normalGap
  const tileSize = (screenWidth - horizontalPadding - cellGap * (columns - 1)) / columns

  const handleGridItemPress = (item: any) => {
    if (searchMode && setSelectedRefs) {
      if (selectedRefs.includes(item.id)) {
        setSelectedRefs(selectedRefs.filter(id => id !== item.id))
      } else {
        setSelectedRefs([...selectedRefs, item.id])
      }
    } else if (onPressItem) {
      onPressItem(item)
    }
  }

  return (
    <GridWrapper columns={columns} rows={rows} cellGap={cellGap}>
      {items.map((item, i) => {
        const isSelected = searchMode && selectedRefs.includes(item.id)
        return (
        <GridTileWrapper
          key={item.id}
          id={item.id}
            onPress={() => handleGridItemPress(item)}
          onLongPress={onLongPressItem}
          onRemove={() => {
            if (onRemoveItem) onRemoveItem(item)
          }}
          type={item.list ? 'list' : item.expand.ref?.image || item.image ? 'image' : 'text'}
            tileStyle={searchMode ? {
              opacity: isSelected ? 1 : 0.25,
            } : {}}
            size={tileSize}
        >
          <GridItem item={item} i={i} />
            {searchMode && isSelected && (
              <View
                style={{
                  position: 'absolute',
                  top: -2.5,
                  left: -2.5,
                  right: -2.5,
                  bottom: -2.5,
                  borderWidth: 5,
                  borderColor: '#A3C9A8',
                  borderRadius: s.$075 + 2.5,
                  pointerEvents: 'none',
                }}
              />
            )}
        </GridTileWrapper>
        )
      })}

      {/* Prompt placeholders for empty slots */}
      {Array.from({ length: gridSize - items.length }).map((_, i) => {
        const prompt = PROMPTS[i % PROMPTS.length]
        return (
          <GridTileWrapper
            key={`placeholder-${i}`}
            type="placeholder"
            onPress={() => onAddItemWithPrompt && onAddItemWithPrompt(prompt)}
            size={tileSize}
          >
            <Text style={{ fontSize: 14 }}>{prompt}</Text>
          </GridTileWrapper>
        )
      })}
    </GridWrapper>
  )
}
