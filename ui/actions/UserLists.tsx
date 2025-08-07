import type { ExpandedItem } from '@/features/types'

import { useState, useEffect } from 'react'
import { Pressable } from 'react-native'
import { ListItem } from '@/ui/lists/ListItem'
import { YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { NewListItemButton } from '@/ui/lists/NewListItemButton'
import { useAppStore } from '@/features/stores'

export const UserLists = ({
  creatorId,
  onComplete,
  onCreateList,
}: {
  creatorId: string
  onComplete: (r: ExpandedItem) => void
  onCreateList: () => void
}) => {
  const [items, setItems] = useState<ExpandedItem[]>([])
  const { getListsByCreator } = useAppStore()

  // Load items based on filter
  const loadItems = async () => {
    try {
      const results = await getListsByCreator(creatorId)

      setItems(results)
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  useEffect(() => {
    loadItems()
  }, [creatorId])

  // Render individual item
  const renderItem = ({ item }: { item: ExpandedItem }) => {
    const itemCount = item?.expand?.items_via_parent?.length || 0
    const firstItem = item?.expand?.items_via_parent?.[0]
    
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          onComplete(item)
        }}
      >
        <ListItem 
          largeImage={true} 
          r={item} 
          backgroundColor={c.olive}
          titleColor={c.surface}
          subtitle={`${itemCount} ref${itemCount !== 1 ? 's' : ''}`}
          firstItemImage={firstItem?.image || firstItem?.expand?.ref?.image}
        />
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
      <NewListItemButton onPress={onCreateList} label="Create new list" />
      {items.map((r) => renderItem({ item: r }))}
    </YStack>
  )
}
