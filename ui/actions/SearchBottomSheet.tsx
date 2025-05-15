import { c, s } from '@/features/style'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import { useCallback, useRef, useState } from 'react'
import { Pressable, Text, ScrollView } from 'react-native'
import { Heading } from '../typo/Heading'
import { XStack, YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { CompleteRef } from '@/features/pocketbase/stores/types'
import { pocketbase } from '@/features/pocketbase'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'

const HEADER_HEIGHT = s.$10

export default function BacklogBottomSheet() {
  const [index, setIndex] = useState(0)

  const isMinimised = index === 0
  const backlogSheetRef = useRef<BottomSheet>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<CompleteRef[]>([])

  const [refs, setRefs] = useState<CompleteRef[]>([])

  const minSnapPoint = Math.min(refs.length, 4) * (s.$3 + s.$1) + s.$1 + HEADER_HEIGHT

  const onAddRefToSearch = (r: CompleteRef) => {
    setRefs((prevState) => [...prevState.filter((ref) => ref.id !== r.id), r])
    setSearchTerm('')
    updateSearch('')
  }

  const updateSearch = async (q: string) => {
    const search = async () => {
      let refsResults: CompleteRef[] = []
      if (q === '') return []
      refsResults = await pocketbase
        .collection<CompleteRef>('refs')
        .getFullList({ filter: `title ~ "${q}"` })
      return refsResults
    }

    setSearchTerm(q)
    const result = await search()
    setResults(result)
  }

  const renderBackdrop = useCallback(
    (p: any) => (
      <BottomSheetBackdrop
        {...p}
        disappearsOnIndex={0}
        appearsOnIndex={1}
        pressBehavior={'collapse'}
      />
    ),
    []
  )

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={backlogSheetRef}
      enablePanDownToClose={false}
      snapPoints={[minSnapPoint, '50%']}
      index={0}
      onChange={(i: number) => {
        setIndex(i)
        if (i === 0) setResults([])
      }}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      keyboardBehavior="interactive"
    >
      <BottomSheetView>
        <Pressable
          onPress={() => {
            if (backlogSheetRef.current && isMinimised) backlogSheetRef.current.snapToIndex(1)
          }}
          style={{
            paddingTop: s.$2,
            paddingBottom: s.$2,
            // backgroundColor: '#f005',
            height: HEADER_HEIGHT,
          }}
        >
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
              <BottomSheetTextInput
                autoFocus
                placeholder="Search anything"
                placeholderTextColor={c.white}
                style={{ fontSize: s.$1, color: c.white }}
                onChangeText={updateSearch}
                value={searchTerm}
              />
            )}
            <XStack gap={s.$05} style={{ alignItems: 'center' }}>
              {/* <Pressable>
                <Ionicons name="add-circle-outline" size={s.$4} color={c.white} />
              </Pressable> */}
              <Button
                variant="whiteInverted"
                title={refs.length ? 'Search' : 'Stumble'}
                onPress={()=>router.push(`/search?refs=${refs.map((r) => r.id).join(',')}`)}
                style={{
                  paddingHorizontal: 0,
                  paddingVertical: s.$075,
                }}
              />
            </XStack>
          </XStack>
        </Pressable>
        {!isMinimised && (
          <BottomSheetScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
            <YStack>
              {results.map((r) => (
                <Pressable key={r.id} onPress={() => onAddRefToSearch(r)}>
                  <XStack
                    gap={s.$1}
                    style={{
                      alignItems: 'center',
                      paddingVertical: s.$075,
                      paddingHorizontal: s.$5,
                    }}
                  >
                    <SimplePinataImage
                      originalSource={r.image!}
                      imageOptions={{ width: s.$2, height: s.$2 }}
                      style={{ width: s.$2, height: s.$2 }}
                    />
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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{
              // backgroundColor: 'lavender',
              height: '90%',
              paddingBottom: s.$0,
            }}
          >
            <YStack
              gap={s.$1}
              style={{
                // backgroundColor: 'purple',
                // height: '90%',
                // paddingTop: s.$2,
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
                    // backgroundColor: 'pink',
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
                        // backgroundColor: 'blue',
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
          </ScrollView>
        )}
      </BottomSheetView>
    </BottomSheet>
  )
}
