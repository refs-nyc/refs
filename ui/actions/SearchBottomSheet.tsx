import { c, s } from '@/features/style'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import { useRef, useState, useEffect } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Heading } from '../typo/Heading'
import { XStack, YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { CompleteRef, Profile } from '@/features/types'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useUIStore } from '../state'

const HEADER_HEIGHT = s.$8

export default function SearchBottomSheet() {
  const [index, setIndex] = useState(0)
  const { newRefSheetRef, setAddingNewRefTo } = useUIStore()

  const isMinimised = index === 0
  const searchSheetRef = useRef<BottomSheet>(null)
  const [searching, setSearching] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const [results, setResults] = useState<CompleteRef[]>([])
  const [refs, setRefs] = useState<CompleteRef[]>([])

  const { user, moduleBackdropAnimatedIndex } = useAppStore()

  useEffect(() => {
    const runSearch = async (query: string) => {
      const refsResults = await pocketbase
        .collection<CompleteRef>('refs')
        .getFullList({ filter: `title ~ "${query}"` })
      setResults(refsResults)
    }

    clearTimeout(searchTimeoutRef.current)

    if (searchTerm === '') {
      setResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      runSearch(searchTerm)
    }, 300)
  }, [searchTerm])

  const onSearchIconPress = () => {
    setSearching(true)
    if (index === 0) {
      searchSheetRef.current?.snapToIndex(1)
    }
  }

  const onAddRefToSearch = (r: CompleteRef) => {
    setRefs((prevState) => [...prevState.filter((ref) => ref.id !== r.id), r])
    setSearchTerm('')
  }

  const stumble = async () => {
    const randomProfile = await pocketbase.collection('users').getList<Profile>(1, 1, {
      filter: 'items:length > 5',
      sort: '@random',
    })
    router.push(`/user/${randomProfile.items[0].userName}`)
  }

  const search = () => {
    // without this there is a shadow on the navigation bar
    // when navigating to search results page
    searchSheetRef.current?.collapse()

    router.push(`/search?refs=${refs.map((r) => r.id).join(',')}`)
  }

  const minSnapPoint = s.$1 + HEADER_HEIGHT
  const snapPoints: (string | number)[] = [minSnapPoint, '90%']

  return (
    <>
      <BottomSheet
        enableDynamicSizing={false}
        ref={searchSheetRef}
        enablePanDownToClose={false}
        snapPoints={snapPoints}
        index={Math.min(index, snapPoints.length - 1)}
        animatedIndex={moduleBackdropAnimatedIndex}
        onChange={(i: number) => {
          setIndex(i)
          if (i === 0) {
            setResults([])
            setRefs([])
            setSearchTerm('')
            setSearching(false)
          }
        }}
        backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
        backdropComponent={(p) => {
          return (
            <BottomSheetBackdrop
              {...p}
              disappearsOnIndex={0}
              appearsOnIndex={1}
              pressBehavior={'collapse'}
            />
          )
        }}
        handleComponent={null}
        keyboardBehavior="interactive"
      >
        {
          <BottomSheetView>
            <Pressable
              style={{
                paddingTop: s.$1,
                paddingBottom: s.$1,
                height: HEADER_HEIGHT,
                justifyContent: 'center',
              }}
              onPress={async () => {
                if (!searching && user?.userName) {
                  setAddingNewRefTo('grid')
                  useUIStore.getState().setAddRefPrompt('')
                  newRefSheetRef.current?.snapToIndex(1)
                }
              }}
            >
              {searching ? (
                <XStack
                  gap={s.$075}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: s.$2,
                  }}
                >
                  {isMinimised ? (
                    <Text style={{ color: c.white, fontSize: s.$1 }}>Search anything</Text>
                  ) : (
                    <TextInput
                      autoFocus
                      placeholder={refs.length ? 'Add more filters' : 'Search anything'}
                      placeholderTextColor={c.white}
                      style={{ fontSize: s.$1, color: c.white, minWidth: '50%' }}
                      onChangeText={setSearchTerm}
                      value={searchTerm}
                    />
                  )}
                  <Button
                    variant="whiteInverted"
                    title={refs.length ? 'Search' : 'Stumble'}
                    onPress={refs.length ? search : stumble}
                    style={{
                      paddingHorizontal: 0,
                      paddingVertical: s.$075,
                    }}
                  />
                </XStack>
              ) : (
                <XStack
                  gap={s.$075}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: s.$2,
                  }}
                >
                  <Text style={{ color: c.white, fontSize: 26, fontWeight: 'bold' }}>
                    Add Ref +
                  </Text>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation()
                      onSearchIconPress()
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: 'rgba(232,232,232,0.15)',
                        borderRadius: 14,
                        padding: 7,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="search" size={s.$2} color={c.white} />
                    </View>
                  </Pressable>
                </XStack>
              )}
            </Pressable>
            {!isMinimised && searchTerm !== '' && (
              <BottomSheetScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
                <YStack>
                  {results.map((r) => (
                    <Pressable key={r.id} onPress={() => onAddRefToSearch(r)}>
                      <XStack
                        gap={s.$025}
                        style={{
                          alignItems: 'center',
                          paddingVertical: s.$075,
                          paddingHorizontal: s.$5,
                        }}
                      >
                        <View
                          style={{
                            width: s.$2,
                            height: s.$2,
                            backgroundColor: c.olive2,
                            borderRadius: s.$05,
                          }}
                        >
                          <SimplePinataImage
                            originalSource={r.image!}
                            imageOptions={{ width: s.$2, height: s.$2 }}
                            style={{ width: s.$2, height: s.$2 }}
                          />
                        </View>
                        <Heading tag="h2normal" style={{ color: c.white, paddingHorizontal: s.$2 }}>
                          {r.title}
                        </Heading>
                      </XStack>
                    </Pressable>
                  ))}
                </YStack>
              </BottomSheetScrollView>
            )}
            {searchTerm === '' && (
              <BottomSheetScrollView
                keyboardShouldPersistTaps="handled"
                style={{
                  height: '90%',
                  paddingBottom: s.$0,
                }}
              >
                <YStack
                  gap={s.$1}
                  style={{
                    paddingBottom: s.$12,
                  }}
                >
                  {refs.map((r) => (
                    <XStack
                      key={r.id}
                      gap={s.$025}
                      style={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: s.$1,
                        height: s.$3,
                      }}
                    >
                      <XStack style={{ width: '85%' }}>
                        <SimplePinataImage
                          originalSource={r.image!}
                          imageOptions={{ width: s.$3, height: s.$3 }}
                          style={{ width: s.$3, height: s.$3, borderRadius: s.$075 }}
                        />
                        <Heading
                          tag="h2normal"
                          style={{
                            color: c.white,
                            paddingHorizontal: s.$2,
                            marginVertical: 'auto',
                          }}
                          numberOfLines={1}
                        >
                          {r.title}
                        </Heading>
                      </XStack>
                      <Pressable
                        onPress={() => {
                          setRefs((prevState) => [...prevState.filter((ref) => ref.id !== r.id)])
                        }}
                      >
                        <Ionicons name="close" size={s.$2} color={c.white} />
                      </Pressable>
                    </XStack>
                  ))}
                </YStack>
              </BottomSheetScrollView>
            )}
          </BottomSheetView>
        }
      </BottomSheet>
    </>
  )
}
