import { useState, useEffect } from 'react'
import { pocketbase, useItemStore } from '@/features/pocketbase'
import { TextInput, Pressable, FlatList, KeyboardAvoidingView, View } from 'react-native'
import { SearchResultItem } from '@/ui/atoms/SearchResultItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { s, c } from '@/features/style'
import { CompleteRef, Item } from '../../features/pocketbase/stores/types'

export const SearchOrAddRef = ({ onComplete }: { onComplete: (r: CompleteRef) => void }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CompleteRef[]>([])

  // const { items } = useItemStore()

  const renderItem = ({ item }: { item: CompleteRef }) => {
    return (
      <Pressable onPress={() => onComplete(item)}>
        <SearchResultItem r={item} />
      </Pressable>
    )
  }

  const updateQuery = async (q: string) => {
    const search = async () => {
      if (q === '') return []

      // Search items and refs db
      const refsResults = await pocketbase
        .collection<CompleteRef>('refs')
        .getFullList({ filter: `title ~ "${q}"` })

      console.log(refsResults.length)
      return refsResults
    }

    setSearchQuery(q)
    const result = await search()
    setSearchResults(result)
  }

  return (
    <View
      style={{
        flex: 1,
        overflow: 'scroll',
        // backgroundColor: 'green'
      }}
    >
      <TextInput
        style={{
          backgroundColor: c.surface2,
          marginVertical: s.$1,
          paddingVertical: s.$08,
          paddingHorizontal: s.$1,
          borderRadius: s.$075,
          color: c.black,
        }}
        autoFocus={true}
        value={searchQuery}
        placeholder="Start typing"
        onChangeText={updateQuery}
      />

      {searchQuery !== '' && (
        <Pressable onPress={() => onComplete({ title: searchQuery })}>
          <NewRefListItem title={searchQuery} />
        </Pressable>
      )}
      <FlatList
        contentContainerStyle={{
          flex: 1,
          gap: s.$025,
          justifyContent: 'flex-start',
          overflow: 'scroll',
          // backgroundColor: 'blue',
        }}
        data={searchResults}
        renderItem={renderItem}
        keyExtractor={(item: any) => item.id}
      />
    </View>
  )
}
