import { useState, useEffect } from 'react'
import { pocketbase, useItemStore } from '@/features/pocketbase'
import { TextInput, Pressable, FlatList, KeyboardAvoidingView, View } from 'react-native'
import { SearchResultItem } from '@/ui/atoms/SearchResultItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { s, c } from '@/features/style'
import { CompleteRef, StagedRef, Item } from '../../features/pocketbase/stores/types'
import { getLinkPreview, getPreviewFromContent } from 'link-preview-js'
import { ScrollView } from 'react-native-gesture-handler'

export const SearchOrAddRef = ({
  noNewRef,
  url,
  image,
  onComplete,
}: {
  noNewRef?: boolean
  url: string
  image: string
  onComplete: (r: CompleteRef) => void
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [urlState, setUrlState] = useState(url)
  const [imageState, setImageState] = useState(image)
  const [searchResults, setSearchResults] = useState<CompleteRef[]>([])

  const renderItem = ({ item }: { item: CompleteRef }) => {
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          onComplete(item)
        }}
      >
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

      if (q.includes('http')) {
        const data = await getLinkPreview(q)
        setUrlState(q)
        if (data?.title) {
          setSearchQuery(data.title)
        }
        if (data?.images?.length > 0) {
          setImageState(data.images[0])
        }
      }
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

      {searchQuery !== '' && !noNewRef && (
        <Pressable
          onPress={() => onComplete({ title: searchQuery, image: imageState, url: urlState })}
        >
          <NewRefListItem title={searchQuery} image={image} />
        </Pressable>
      )}
      <ScrollView
        style={{
          flex: 1,
          gap: s.$025,
          overflow: 'scroll',
          minHeight: s.$12,
        }}
      >
        {searchResults.map((r) => renderItem({ item: r }))}
      </ScrollView>
    </View>
  )
}
