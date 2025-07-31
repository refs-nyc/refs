import { GridWrapper } from './GridWrapper'
import { GridTile } from './GridTile'
import { GridItem } from './GridItem'
import { GridTileWrapper } from './GridTileWrapper'
import { GridTileActionAdd } from './GridTileActionAdd'
import { ExpandedItem } from '@/features/types'
import { useState, useCallback, useMemo } from 'react'
import { Text, View, Dimensions } from 'react-native'

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
  setSelectedRefs?: (refs: string[]) => void
}) => {
  const gridSize = columns * rows
  const screenWidth = Dimensions.get('window').width
  const horizontalPadding = 20 // 10px on each side
  const cellGap = 6 // Keep consistent gap regardless of search mode
  const tileSize = (screenWidth - horizontalPadding - cellGap * (columns - 1)) / columns

  const handleGridItemPress = useCallback((item: any) => {
    if (searchMode && setSelectedRefs) {
      const itemId = item.id
      
      // Use Set for O(1) lookup and manipulation
      const selectedSet = new Set(selectedRefs)
      
      if (selectedSet.has(itemId)) {
        // Remove item
        selectedSet.delete(itemId)
      } else {
        // Add item
        selectedSet.add(itemId)
      }
      
      setSelectedRefs(Array.from(selectedSet))
    } else if (onPressItem) {
      onPressItem(item)
    }
  }, [searchMode, setSelectedRefs, selectedRefs, onPressItem])

  // Memoize the selected refs set for O(1) lookup
  const selectedRefsSet = useMemo(() => new Set(selectedRefs), [selectedRefs])

  return (
    <GridWrapper columns={columns} rows={rows}>
      {items.map((item, i) => {
        const isSelected = searchMode && selectedRefsSet.has(item.id)
        return (
        <GridTileWrapper
          key={item.id}
          id={item.id}
          onPress={useCallback(() => handleGridItemPress(item), [handleGridItemPress, item])}
          onLongPress={onLongPressItem}
          onRemove={useCallback(() => {
            if (onRemoveItem) onRemoveItem(item)
          }, [onRemoveItem, item])}
          type={item.list ? 'list' : item.expand.ref?.image || item.image ? 'image' : 'text'}
          tileStyle={searchMode ? {
            opacity: isSelected ? 1 : 0.25,
          } : {}}
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
                borderRadius: 8 + 2.5,
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
          >
            <Text style={{ fontSize: 14 }}>{prompt}</Text>
          </GridTileWrapper>
        )
      })}
    </GridWrapper>
  )
}
