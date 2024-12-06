import { useState, useMemo } from 'react'
import { useItemStore } from 'app/features/canvas/models'
import { YStack, Button, XStack, View, Text } from 'tamagui'
import { getTokens } from '@tamagui/core'
import { TextInput, Pressable, FlatList } from 'react-native'
import { SearchResultItem } from '../atoms/SearchResultItem'
import { NewRefListItem } from '../atoms/NewRefListItem'

const SEARCH_ARRAY: RefsItem[] = [
  {
    id: '1',
    title: 'SOMETHING COOL',
    image:
      'https://rogerfederer.com/wp-content/themes/roger-federer-2024/assets/graphics/records-bg-v4.1.1.jpg',
    createdAt: Date.now(),
  },
  {
    id: '2',
    title: 'SOMETHING COOL',
    image:
      'https://rogerfederer.com/wp-content/themes/roger-federer-2024/assets/graphics/records-bg-v4.1.1.jpg',
    createdAt: Date.now(),
  },
  {
    id: '3',
    title: 'SOMETHING COOL WITH A VERY LONG TITLE',
    image:
      'https://rogerfederer.com/wp-content/themes/roger-federer-2024/assets/graphics/records-bg-v4.1.1.jpg',
    createdAt: Date.now(),
  },
]

export const SearchOrAddRef = ({ onComplete }: { onComplete: (r: StagedRef) => void }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RefsItem[]>([])

  const { items } = useItemStore()

  console.log(items)

  const searchableItems = useMemo(() => [...SEARCH_ARRAY, ...items], [SEARCH_ARRAY, items])

  const { size, color } = getTokens()

  const renderItem = ({ item }) => {
    return (
      <Pressable onPress={() => onComplete({ title: searchQuery })}>
        <SearchResultItem r={item} />
      </Pressable>
    )
  }

  const updateQuery = (q: string) => {
    const search = () => {
      console.log(q == '')
      if (q == '') return []
      return searchableItems.filter((item) => {
        const pattern = new RegExp(q, 'i')

        return item?.title?.match(pattern) || item?.image?.match(pattern)
      })
    }

    setSearchResults(search())
    setSearchQuery(q)
  }

  return (
    <YStack height="100%" jc="space-between">
      <View my="$2" bg="$surface-2" py="$3" px="$4" borderRadius="$2">
        <TextInput
          autoFocus={true}
          value={searchQuery}
          placeholder="Start typing"
          onChangeText={updateQuery}
        />
      </View>

      {searchQuery !== '' && (
        <Pressable onPress={() => onComplete({ title: searchQuery })}>
          <NewRefListItem title={searchQuery}></NewRefListItem>
        </Pressable>
      )}

      <FlatList data={searchResults} renderItem={renderItem} keyExtractor={(item) => item.id} />

      {/* New ref */}
      <XStack jc="space-between">
        <Text>{searchQuery}</Text>

        <Pressable onPress={() => onComplete({ title: searchQuery })}>
          <Text>New ref</Text>
        </Pressable>
      </XStack>
    </YStack>
  )
}
