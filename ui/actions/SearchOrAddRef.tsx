import { useState } from 'react'
import { pocketbase, useItemStore } from '@/features/canvas/stores'
import { TextInput, Pressable, FlatList, KeyboardAvoidingView, View } from 'react-native'
import { SearchResultItem } from '@/ui/atoms/SearchResultItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { s, c } from '@/features/style'

export const SearchOrAddRef = ({ onComplete }: { onComplete: (r: StagedRef) => void }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RefsItem[]>([])
  const [realHeight, setRealHeight] = useState(400)

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
      if (q === '') return []

      // Search items and refs db
      const refsResults = await pocketbase
        .collection('refs')
        .getFullList({ filter: `title ~ "${q}"` })

      console.log(refsResults.length)
      return refsResults
    }

    const result = await search()
    setSearchResults(result)
    setSearchQuery(q)
  }

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        // maxHeight: realHeight * 0.9,
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

      <View>
        {searchQuery !== '' && (
          <Pressable onPress={() => onComplete({ title: searchQuery })}>
            <NewRefListItem title={searchQuery}></NewRefListItem>
          </Pressable>
        )}
        <FlatList
          contentContainerStyle={{
            gap: s.$025,
            justifyContent: 'flex-start',
            maxHeight: '100%',
          }}
          data={searchResults}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
        />
      </View>
    </KeyboardAvoidingView>
  )
}
