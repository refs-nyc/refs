import { useState, useEffect } from 'react'
import { pocketbase, useItemStore } from '@/features/pocketbase'
import { TextInput, Pressable, FlatList, KeyboardAvoidingView, View } from 'react-native'
import { SearchResultItem } from '@/ui/atoms/SearchResultItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { CompleteRef, StagedRef, Item } from '../../features/pocketbase/stores/types'
import { getLinkPreview, getPreviewFromContent } from 'link-preview-js'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import * as Clipboard from 'expo-clipboard'

export const SearchRef = ({
  noNewRef,
  url,
  image,
  paste,
  onComplete,
}: {
  noNewRef?: boolean
  url: string
  image: string
  paste: boolean
  onComplete: (r: CompleteRef) => void
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [disableNewRef, setDisableNewRef] = useState(false)
  const [urlState, setUrlState] = useState(url)
  const [imageState, setImageState] = useState(image)
  const [searchResults, setSearchResults] = useState<CompleteRef[]>([])
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext()

  // Search result item
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

  // Update current ref
  const updateState = (u: string, data: any) => {
    setUrlState(u)
    if (data?.title) {
      setSearchQuery(data.title)
    }
    if (data?.images?.length > 0) {
      setImageState(data.images[0])
    }
  }

  // Update the search query
  const updateQuery = async (q: string) => {
    const search = async () => {
      if (q === '') return []

      // Search items and refs db
      const refsResults = await pocketbase
        .collection<CompleteRef>('refs')
        .getFullList({ filter: `title ~ "${q}"` })

      if (q.includes('http')) {
        const data = await getLinkPreview(q)
        updateState(q, data)
      }
      return refsResults
    }

    setSearchQuery(q)
    const result = await search()
    setSearchResults(result)
  }

  useEffect(() => {
    const titles = searchResults.map((r) => r.title?.toLowerCase())

    if (titles.includes(searchQuery.toLowerCase())) {
      setDisableNewRef(true)
    } else {
      setDisableNewRef(false)
    }
  }, [searchQuery, searchResults])

  // Handle incoming share intent
  useEffect(() => {
    const useIntent = async (u: string) => {
      const data = await getLinkPreview(u)
      updateState(u, data)
    }
    if (hasShareIntent && shareIntent.webUrl) {
      useIntent(shareIntent.webUrl)
    }
  }, [hasShareIntent, shareIntent])

  // Handle paste
  useEffect(() => {
    const doPaste = async () => {
      const u = await Clipboard.getUrlAsync()
      console.log(u)
      setSearchQuery(u)
      if (u) {
        const data = await getLinkPreview(u)
        updateState(u, data)
      }
    }
    if (paste) {
      doPaste()
    }
  }, [paste])

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <TextInput
        style={{
          backgroundColor: c.surface2,
          marginVertical: s.$1,
          paddingVertical: s.$1,
          paddingHorizontal: s.$1,
          borderRadius: s.$075,
          color: c.black,
        }}
        autoFocus={true}
        value={searchQuery}
        placeholder="Start typing"
        onChangeText={updateQuery}
      />

      {searchQuery !== '' && !noNewRef && !disableNewRef && (
        <Pressable
          onPress={() => onComplete({ title: searchQuery, image: imageState, url: urlState })}
        >
          <NewRefListItem title={searchQuery} image={image} />
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
    </View>
  )
}
