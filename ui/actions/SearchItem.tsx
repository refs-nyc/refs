import type { ExpandedItem } from '@/features/pocketbase/stores/types'

import { useState } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { Pressable } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { ListItem } from '@/ui/lists/ListItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { ItemsRecord } from '@/features/pocketbase/stores/pocketbase-types'

export const SearchItem = ({ onComplete }: { onComplete: (r: ExpandedItem) => void }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ExpandedItem[]>([])

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
      let itemResults: ItemsRecord[] = []

      if (q === '') return []

      itemResults = await pocketbase
        .collection<ExpandedItem>('items')
        .getFullList({ filter: `ref.title ~ "${q}"`, expand: 'ref' })
      return itemResults
    }

    setSearchQuery(q)
    let result = await search()
    setSearchResults(result as ExpandedItem[])
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
