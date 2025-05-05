import type { ExpandedItem } from '@/features/pocketbase/stores/types'

import { useState, useEffect } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { Pressable } from 'react-native'
import { ListItem } from '@/ui/lists/ListItem'
import { YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { NewListItemButton } from '@/ui/lists/NewListItemButton'

export const FilteredItems = ({
  filter,
  onComplete,
  onCreateList,
}: {
  filter: string
  onComplete: (r: ExpandedItem) => void
  onCreateList: () => void
}) => {
  const [items, setItems] = useState<ExpandedItem[]>([])

  // Load items based on filter
  const loadItems = async () => {
    try {
      const results = await pocketbase
        .collection<ExpandedItem>('items')
        .getFullList({ filter, expand: 'ref' })
      setItems(results)
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  useEffect(() => {
    loadItems()
  }, [filter])

  // Render individual item
  const renderItem = ({ item }: { item: ExpandedItem }) => {
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          onComplete(item)
        }}
      >
        <ListItem largeImage={true} r={item} />
      </Pressable>
    )
  }

  return (
    <YStack
      style={{
        flex: 1,
        gap: s.$025,
        minHeight: s.$12,
      }}
    >
      <NewListItemButton onPress={onCreateList} />
      {items.map((r) => renderItem({ item: r }))}
    </YStack>
  )
}
