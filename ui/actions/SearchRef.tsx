import { useState, useEffect, useRef } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { Pressable, View } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { ListItem } from '@/ui/lists/ListItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { XStack, YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { CompleteRef } from '../../features/pocketbase/stores/types'
import { getLinkPreview } from 'link-preview-js'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import * as Clipboard from 'expo-clipboard'
import { RefsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { Image } from 'expo-image'
import Animated, { StretchInY, StretchOutY } from 'react-native-reanimated'

const ImageSearchResults = ({
  imageSearchResults,
  onImagePress,
  setPicking,
}: {
  imageSearchResults: string[]
  onImagePress: (url: string) => void
  setPicking: (b: boolean) => void
}) => {
  return (
    <Animated.View
      entering={StretchInY.duration(200)}
      exiting={StretchOutY.duration(200)}
      style={{ flexDirection: 'row', gap: s.$075, width: '100%' }}
    >
      {imageSearchResults.map((url, index) =>
        url ? (
          <Pressable key={url} onPress={() => onImagePress(url)}>
            <Image
              style={{ borderRadius: s.$075, width: s.$7, height: s.$7, backgroundColor: c.olive2 }}
              source={url}
              contentFit="cover"
            />
          </Pressable>
        ) : (
          <View
            key={index}
            style={{ width: s.$7, height: s.$7, backgroundColor: c.olive2, borderRadius: s.$075 }}
          />
        )
      )}
      <Pressable
        onPress={() => setPicking(true)}
        style={{
          borderColor: c.white,
          borderWidth: 2,
          borderRadius: s.$075,
          width: s.$7,
          height: s.$7,
          alignContent: 'center',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="camera-outline" size={s.$3} color={c.white} />
      </Pressable>
    </Animated.View>
  )
}

export type NewRefFields = {
  title: string
  image?: string
  url?: string
  promptContext?: string
}

export const SearchRef = ({
  noNewRef,
  url,
  image,
  paste,
  onChooseExistingRef,
  onAddNewRef,
  prompt,
}: {
  noNewRef?: boolean
  url?: string
  image?: string
  paste?: boolean
  onChooseExistingRef: (r: CompleteRef, newImage?: string) => void
  onAddNewRef: (fields: NewRefFields) => void
  prompt?: string
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [disableNewRef, setDisableNewRef] = useState(false)
  const [urlState, setUrlState] = useState(url)
  const [imageState, setImageState] = useState(image)
  const [searchResults, setSearchResults] = useState<CompleteRef[]>([])
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext()
  const [picking, setPicking] = useState(false)
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [uploadInitiated, setUploadInitiated] = useState(false)
  const [imageSearchResults, setImageSearchResults] = useState<string[]>([])
  const [displayingImagesFor, setDisplayingImagesFor] = useState<string>('') //ref id OR search query

  // Track the current query to prevent race conditions
  const currentQueryRef = useRef('')

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Search result item
  const renderItem = ({ item }: { item: CompleteRef }) => {
    return (
      <View key={item.id}>
        <Pressable onPress={() => onRefPress(item.id, item)}>
          <ListItem
            r={item}
            backgroundColor={c.olive}
            onTitlePress={() => onRefPress(item.id, item)}
          />
        </Pressable>
        <XStack gap={s.$1}>
          {imageSearchResults && displayingImagesFor === item.id && (
            <ImageSearchResults
              imageSearchResults={imageSearchResults}
              onImagePress={(imageUrl) => onChooseExistingRef(item, imageUrl)}
              setPicking={setPicking}
            />
          )}
        </XStack>
      </View>
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

  const onQueryChange = (q: string) => {
    // Update the current query ref immediately
    currentQueryRef.current = q
    setSearchQuery(q)
    setDisplayingImagesFor('')
    setImageSearchResults([])
  }

  useEffect(() => {
    const runSearch = async () => {
      let refsResults: RefsRecord[] = []

      if (debouncedQuery === '') {
        setSearchResults([])
        return
      }

      if (debouncedQuery.includes('http')) {
        const data = await getLinkPreview(debouncedQuery)
        // Only update state if this is still the current query
        if (currentQueryRef.current === debouncedQuery) {
          updateState(debouncedQuery, data)
        }
      } else {
        // Search items and refs db
        refsResults = await pocketbase
          .collection<CompleteRef>('refs')
          .getFullList({ filter: `title ~ "${debouncedQuery}"` })
      }

      // Only update search results if this is still the current query
      if (currentQueryRef.current === debouncedQuery) {
        setSearchResults(refsResults)
      }
    }
    runSearch()
  }, [debouncedQuery])

  useEffect(() => {
    const titles = searchResults.map((r) => r?.title?.toLowerCase())

    if (titles?.includes(debouncedQuery.toLowerCase())) {
      setDisableNewRef(true)
    } else {
      setDisableNewRef(false)
    }
  }, [debouncedQuery, searchResults])

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

  const onRefPress = async (refId: string, ref?: CompleteRef) => {
    // if we're already displaying images for this ref, don't do anything
    if (displayingImagesFor === refId) return

    // if the user already uploaded an image from camera roll, just add the ref
    if (imageState) {
      if (ref) {
        onChooseExistingRef(ref, imageState)
      } else {
        onAddNewRef({ title: searchQuery, image: imageState, url: urlState, promptContext: prompt })
      }
      return
    }

    // otherwise, search for images
    setDisplayingImagesFor(refId)
    setImageSearchResults(['', '', ''])
    try {
      const params = new URLSearchParams({
        key: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_API_KEY!,
        cx: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_ENGINE_ID!,
        q: ref?.title || searchQuery,
        searchType: 'image',
      })

      const results = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`).then(
        (res) => res.json()
      )

      const resultUrls = results.items.map((item: any) => item.link).slice(0, 3)
      setImageSearchResults(resultUrls)
    } catch (error) {
      console.error(error)
      setImageSearchResults([])
      setDisplayingImagesFor('')
    }
  }

  return (
    <>
      <KeyboardAvoidingView style={{ width: '100%' }}>
        <View
          style={{
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
          }}
        >
          <TextInput
            style={{
              flex: 1,
              color: c.surface,
              fontSize: 16,
              width: '100%',
              textAlignVertical: 'center',
            }}
            value={searchQuery}
            placeholder={prompt || 'search anything or paste a link'}
            placeholderTextColor={'rgba(243,242,237,0.5)'}
            onChangeText={onQueryChange}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={10} style={{ marginLeft: 8 }}>
              <Ionicons name="close-circle" size={22} color={c.surface} />
            </Pressable>
          )}
          {imageAsset && (
            <PinataImage
              asset={imageAsset}
              size={s.$2}
              onReplace={() => {
                setPicking(true)
                setImageAsset(null)
              }}
              onSuccess={(url: string) => {
                setImageState(url)
                setImageSearchResults([])
                setDisplayingImagesFor('')
              }}
              onFail={() => {
                console.error('Upload failed')
                setUploadInProgress(false)
                setImageAsset(null)
              }}
            />
          )}
        </View>
        {searchQuery.length === 0 && imageAsset === null && (
          <Button
            title="Add from Camera Roll"
            onPress={() => {
              setPicking(true)
            }}
            style={{
              backgroundColor: 'rgba(232,232,232,0.15)',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderColor: 'transparent',
              alignSelf: 'center',
              minWidth: 180,
            }}
          />
        )}
        {picking && (
          <Picker
            onSuccess={(a: ImagePickerAsset) => {
              setImageAsset(a)
              setPicking(false)
              setUploadInProgress(true)
              setUploadInitiated(true)
            }}
            onCancel={() => {
              setPicking(false)
            }}
          />
        )}

        {/* Option to Create New Ref */}
        {searchQuery !== '' && !noNewRef && !disableNewRef && (
          <>
            <Pressable onPress={() => onRefPress(searchQuery)}>
              <NewRefListItem title={searchQuery} image={image || ''} />
            </Pressable>
            <XStack gap={s.$075}>
              {imageSearchResults && displayingImagesFor === searchQuery && (
                <ImageSearchResults
                  imageSearchResults={imageSearchResults}
                  onImagePress={(imageUrl) =>
                    onAddNewRef({ title: searchQuery, image: imageUrl, url: urlState, promptContext: prompt })
                  }
                  setPicking={setPicking}
                />
              )}
            </XStack>
          </>
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
