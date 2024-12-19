import { useState } from 'react'
import { pocketbase, useItemStore } from '@/features/canvas/stores'
import { YStack, XStack } from '@/ui'
import { TextInput, Pressable, FlatList, View, Text } from 'react-native'
import { SearchResultItem } from '@/ui/atoms/SearchResultItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { s, c } from '@/features/style'

export const SearchOrAddRef = ({ onComplete }: { onComplete: (r: StagedRef) => void }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RefsItem[]>([])

  // const { items } = useItemStore()

  const renderItem = ({ item }) => {
    return (
      <Pressable onPress={() => onComplete({ title: searchQuery })}>
        <SearchResultItem r={item} />
      </Pressable>
    )
  }

  const updateQuery = async (q: string) => {
    const search = async () => {
      console.log(q == '')
      if (q === '') return []

      // Search items and refs db
      const refsResults = await pocketbase
        .collection('refs')
        .getFullList({ filter: `title ~ "${q}"` })

      return refsResults
    }

    const result = await search()
    setSearchResults(result)
    setSearchQuery(q)
  }

  return (
    <YStack height="100%" jc="space-between">
      <View
        style={{
          backgroundColor: c.surface2,
          marginVertical: s.$1,
          paddingVertical: s.$08,
          paddingHorizontal: s.$1,
          borderRadius: s.$075,
        }}
      >
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

      <FlatList
        style={{ height: 300 }}
        data={searchResults}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </YStack>
  )
}
