import { useState, useEffect } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { Pressable, View } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { ListItem } from '@/ui/lists/ListItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { CompleteRef } from '../../features/pocketbase/stores/types'
import { getLinkPreview } from 'link-preview-js'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import * as Clipboard from 'expo-clipboard'
import { RefsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { Ionicons } from '@expo/vector-icons'

export const SearchRef = ({
  noNewRef,
  url,
  image,
  paste,
  onComplete,
}: {
  noNewRef?: boolean
  url?: string
  image?: string
  paste?: boolean
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
        <ListItem r={item} backgroundColor={c.olive} />
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
      let refsResults: RefsRecord[] = []

      if (q === '') return []

      if (q.includes('http')) {
        const data = await getLinkPreview(q)
        updateState(q, data)
      } else {
        // Search items and refs db
        refsResults = await pocketbase
          .collection<CompleteRef>('refs')
          .getFullList({ filter: `title ~ "${q}"` })
      }
      return refsResults
    }

    setSearchQuery(q)
    let result = await search()
    setSearchResults(result)
  }

  useEffect(() => {
    const titles = searchResults.map((r) => r?.title?.toLowerCase())

    if (titles?.includes(searchQuery?.toLowerCase())) {
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
      if (u === null) return
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
    <>
      <KeyboardAvoidingView style={{ width: '100%' }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'transparent',
          marginVertical: s.$1,
          height: 42,
          paddingVertical: 0,
          paddingHorizontal: 10,
          borderRadius: 50,
          borderWidth: 1,
          borderColor: c.surface,
        }}>
          <TextInput
            style={{
              flex: 1,
              color: c.surface,
              fontSize: 16,
              width: '100%',
              textAlignVertical: 'center',
            }}
            value={searchQuery}
            placeholder="Search anything or start typing"
            placeholderTextColor={c.surface}
            onChangeText={updateQuery}
            autoFocus={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10} style={{ marginLeft: 8 }}>
              <Ionicons name="close-circle" size={22} color={c.surface} />
            </Pressable>
          )}
        </View>

        {searchQuery !== '' && !noNewRef && !disableNewRef && (
          <Pressable
            onPress={() => {
              // @ts-ignore
              return onComplete({ title: searchQuery, image: imageState, url: urlState })
            }}
          >
            {/* @ts-ignore */}
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
      </KeyboardAvoidingView>
    </>
  )
}
