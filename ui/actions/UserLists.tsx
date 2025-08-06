import type { ExpandedItem, Profile } from '@/features/types'

import { useState, useEffect } from 'react'
import { Pressable } from 'react-native'
import { ListItem } from '@/ui/lists/ListItem'
import { YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { NewListItemButton } from '@/ui/lists/NewListItemButton'
import { useAppStore } from '@/features/stores'

export const UserLists = ({
  creator,
  onComplete,
  onCreateList,
}: {
  creator: Profile
  onComplete: (r: ExpandedItem) => void
  onCreateList: () => void
}) => {
  const [items, setItems] = useState<ExpandedItem[]>([])
  const { getListsByCreator } = useAppStore()

  // Load items based on filter
  const loadItems = async () => {
    try {
      const results = await getListsByCreator(creator)

      setItems(results)
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  useEffect(() => {
    loadItems()
  }, [creator])

  // Render individual item
  const renderItem = ({ item }: { item: ExpandedItem }) => {
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          onComplete(item)
        }}
      >
        <ListItem largeImage={true} r={item} backgroundColor={c.olive} />
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
