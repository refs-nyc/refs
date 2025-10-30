import { useState, useEffect, useRef } from 'react'
import { Pressable, View, Text, Linking } from 'react-native'
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'
import { ListItem } from '@/ui/lists/ListItem'
import { NewRefListItem } from '@/ui/atoms/NewRefListItem'
import { XStack, YStack } from '@/ui/core/Stacks'
import { s, c } from '@/features/style'
import { CompleteRef } from '@/features/types'
import { getLinkPreview } from 'link-preview-js'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import * as Clipboard from 'expo-clipboard'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { Image } from 'expo-image'
import Animated, { StretchInY, StretchOutY } from 'react-native-reanimated'
import { useAppStore } from '@/features/stores'

type GoogleImageResult = {
  id: string
  url: string
  contextUrl: string
  displayLink: string
}

const ImageSearchResults = ({
  imageSearchResults,
  onImagePress,
  onSourcePress,
  setPicking,
}: {
  imageSearchResults: GoogleImageResult[]
  onImagePress: (result: GoogleImageResult) => void
  onSourcePress: (url: string) => void
  setPicking: (b: boolean) => void
}) => {
  return (
    <Animated.View
      entering={StretchInY.duration(200)}
      exiting={StretchOutY.duration(200)}
      style={{ flexDirection: 'row', gap: s.$075, width: '100%' }}
    >
      {imageSearchResults.map((result, index) => {
        if (!result.url) {
          return (
            <View
              key={result.id || `placeholder-${index}`}
              style={{ width: s.$7, height: s.$7, backgroundColor: c.olive2, borderRadius: s.$075 }}
            />
          )
        }
        return (
          <View key={result.id || result.url} style={{ alignItems: 'center', gap: 4 }}>
            <Pressable onPress={() => onImagePress(result)}>
              <Image
                style={{ borderRadius: s.$075, width: s.$7, height: s.$7, backgroundColor: c.olive2 }}
                source={result.url}
                contentFit="cover"
              />
            </Pressable>
            <Pressable
              onPress={() => onSourcePress(result.contextUrl)}
              hitSlop={10}
              style={{ maxWidth: s.$7 }}
            >
              <Text
                numberOfLines={1}
                style={{ fontSize: 10, color: c.surface, opacity: 0.65, textAlign: 'center' }}
              >
                {result.displayLink || 'Source'}
              </Text>
            </Pressable>
          </View>
        )
      })}
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
  image?: string | ImagePickerAsset
  url?: string
  promptContext?: string
  meta?: string
  imageSource?: {
    url: string
    label?: string
  }
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
  onChooseExistingRef: (r: CompleteRef, newImage?: string, attribution?: GoogleImageResult) => void
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
  const [imageSearchResults, setImageSearchResults] = useState<GoogleImageResult[]>([])
  const [displayingImagesFor, setDisplayingImagesFor] = useState<string>('') // ref id OR search query
  const [imageResultsCache, setImageResultsCache] = useState<Record<string, GoogleImageResult[]>>({})

  const { getRefsByTitle } = useAppStore()

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
            titleColor={c.surface}
          />
        </Pressable>
        <XStack gap={s.$1} style={{ paddingLeft: s.$08 }}>
          {imageSearchResults && displayingImagesFor === item.id && (
            <ImageSearchResults
              imageSearchResults={imageSearchResults}
              onImagePress={(result) => {
                if (result.url) {
                  onChooseExistingRef(item, result.url, result)
                }
              }}
              onSourcePress={(url) => {
                if (!url) return
                Linking.openURL(url).catch(() => {})
              }}
              setPicking={setPicking}
            />
          )}
        </XStack>
        {imageSearchResults && displayingImagesFor === item.id && (
          <Text style={{ color: c.surface, opacity: 0.6, fontSize: 12, paddingLeft: s.$08, marginTop: 4 }}>
            Images from Google
          </Text>
        )}
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
      let refsResults: CompleteRef[] = []

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
        refsResults = await getRefsByTitle(debouncedQuery)
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
    // If already showing, toggle closed but cache what we fetched
    if (displayingImagesFor === refId) {
      setImageResultsCache((prev) => ({
        ...prev,
        [refId]: imageSearchResults.filter((entry) => Boolean(entry.url)),
      }))
      setDisplayingImagesFor('')
      return
    }

    // if the user already uploaded an image from camera roll, just add the ref
    if (imageState) {
      if (ref) {
        onChooseExistingRef(ref, imageState)
      } else {
        onAddNewRef({ title: searchQuery, image: imageState, url: urlState, promptContext: prompt })
      }
      return
    }

    // If we have cached results for this id/query, use them immediately
    const cached = imageResultsCache[refId]
    if (cached && cached.length > 0) {
      setImageSearchResults(cached)
      setDisplayingImagesFor(refId)
      return
    }

    // otherwise, search for images
    setDisplayingImagesFor(refId)
    setImageSearchResults(
      Array.from({ length: 3 }).map((_, idx) => ({
        id: `placeholder-${refId}-${idx}`,
        url: '',
        contextUrl: '',
        displayLink: '',
      }))
    )
    try {
      const params = new URLSearchParams({
        key: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_API_KEY!,
        cx: process.env.EXPO_PUBLIC_GOOGLE_SEARCH_ENGINE_ID!,
        q: ref?.title || searchQuery,
        searchType: 'image',
      })

      const results = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`).then((res) =>
        res.json()
      )

      const mappedResults: GoogleImageResult[] = Array.isArray(results.items)
        ? results.items.slice(0, 3).map((item: any, index: number) => {
            const contextUrl = item?.image?.contextLink || item?.link || ''
            let displayLink = item?.displayLink || ''
            if (!displayLink && contextUrl) {
              try {
                displayLink = new URL(contextUrl).hostname
              } catch (error) {
                displayLink = ''
              }
            }
            return {
              id: item?.cacheId || item?.link || `${refId}-${index}`,
              url: item?.link || '',
              contextUrl,
              displayLink,
            }
          })
        : []

      setImageSearchResults(mappedResults)
      setImageResultsCache((prev) => ({
        ...prev,
        [refId]: mappedResults.filter((entry) => Boolean(entry.url)),
      }))
    } catch (error) {
      console.error(error)
      setImageSearchResults([])
      setDisplayingImagesFor('')
    }
  }

  return (
    <>
      <View style={{ width: '100%' }}>
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
              allowBackgroundUpload={true}
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
              // Immediately proceed to the add form preloaded with this photo
              onAddNewRef({ title: '', image: a, url: urlState, promptContext: prompt })
            }}
            onCancel={() => {
              setPicking(false)
            }}
          />
        )}

        {/* Option to Create New Ref */}
        {searchQuery !== '' && !noNewRef && !disableNewRef && (
          <>
            <Pressable
              onPress={() => {
                // Toggle behavior for new-ref row based on current state
                if (displayingImagesFor === searchQuery) {
                  setImageResultsCache((prev) => ({
                    ...prev,
                    [searchQuery]: imageSearchResults.filter((entry) => Boolean(entry.url)),
                  }))
                  setDisplayingImagesFor('')
                } else {
                  onRefPress(searchQuery)
                }
              }}
            >
              <NewRefListItem title={searchQuery} image={image || ''} />
            </Pressable>
            <XStack gap={s.$075} style={{ paddingLeft: s.$08 }}>
              {imageSearchResults && displayingImagesFor === searchQuery && (
                <ImageSearchResults
                  imageSearchResults={imageSearchResults}
                  onImagePress={(result) => {
                    if (!result.url) return
                    onAddNewRef({
                      title: searchQuery,
                      image: result.url,
                      url: urlState,
                      promptContext: prompt,
                      imageSource: {
                        url: result.contextUrl || result.url,
                        label: result.displayLink,
                      },
                    })
                  }}
                  onSourcePress={(url) => {
                    if (!url) return
                    Linking.openURL(url).catch(() => {})
                  }}
                  setPicking={setPicking}
                />
              )}
            </XStack>
            {imageSearchResults && displayingImagesFor === searchQuery && (
              <Text style={{ color: c.surface, opacity: 0.6, fontSize: 12, paddingLeft: s.$08, marginTop: 4 }}>
                Images from Google
              </Text>
            )}
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
      </View>
    </>
  )
}
