import type { ExpandedItem } from '@/features/types'

import { useState } from 'react'
import { Pressable } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { ListItem } from '@/ui/lists/ListItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { useAppStore } from '@/features/stores'

export const SearchItem = ({ onComplete }: { onComplete: (r: ExpandedItem) => void }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ExpandedItem[]>([])

  const { getItemsByRefTitle } = useAppStore()

  // Search result item
  const renderItem = ({ item }: { item: ExpandedItem }) => {
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          onComplete(item)
        }}
      >
        <ListItem r={item} />
      </Pressable>
    )
  }

  // Update the search query
  const updateQuery = async (q: string) => {
    const search = async () => {
      if (q === '') return []

      return await getItemsByRefTitle(q)
    }

    setSearchQuery(q)
    let result = await search()
    setSearchResults(result)
  }

  return (
    <>
      <TextInput
        style={{
          backgroundColor: c.surface2,
          marginVertical: s.$1,
          paddingVertical: s.$1,
          paddingHorizontal: s.$1,
          borderRadius: s.$075,
          color: c.black,
        }}
        clearButtonMode="while-editing"
        value={searchQuery}
        placeholder="Search anything or paste a link"
        onChangeText={updateQuery}
        autoFocus={true}
      />

      {searchQuery !== '' && (
        <Pressable onPress={() => {}}>
          {/* @ts-ignore */}
          <NewRefListItem title={searchQuery} />
        </Pressable>
      )}
      <YStack
        style={{
          flex: 1,
          gap: s.$025,
          minHeight: s.$12,
        }}
      >
        {searchResults.map((r) => renderItem({ item: r }))}
      </YStack>
    </>
  )
}
