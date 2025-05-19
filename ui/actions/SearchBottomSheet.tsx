import { c, s } from '@/features/style'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import { useCallback, useRef, useState } from 'react'
import { Pressable, Text, ScrollView, View } from 'react-native'
import { Heading } from '../typo/Heading'
import { XStack, YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { CompleteRef, Item, Profile } from '@/features/pocketbase/stores/types'
import { pocketbase, useUserStore } from '@/features/pocketbase'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Sheet } from '../core/Sheets'
import { NewRef, NewRefStep } from './NewRef'

const HEADER_HEIGHT = s.$10

export default function SearchBottomSheet() {
  const [index, setIndex] = useState(0)

  const isMinimised = index === 0
  const searchSheetRef = useRef<BottomSheet>(null)
  const [addingTo, setAddingTo] = useState('')
  const [step, setStep] = useState('')
  const [newRefTitle, setNewRefTitle] = useState('')
  const [initialStep, setInitialStep] = useState<NewRefStep>('')

  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<CompleteRef[]>([])

  const [refs, setRefs] = useState<CompleteRef[]>([])

  const { user } = useUserStore()

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

  const onAddFromSearch = () => {
    setInitialStep('add')
    setNewRefTitle(searchTerm)
    setAddingTo(user?.items && user.items?.length < 12 ? 'grid' : 'backlog')
  }

  const stopAdding = () => {
    setInitialStep('')
    setNewRefTitle('')
    setAddingTo('')
  }

  const stumble = async () => {
    const randomProfile = await pocketbase.collection('users').getList<Profile>(1, 1, {
      filter: 'items:length > 5',
      sort: '@random',
    })
    router.push(`/user/${randomProfile.items[0].userName}`)
  }

  const search = () => {
    router.push(`/search?refs=${refs.map((r) => r.id).join(',')}`)
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
    <>
      <BottomSheet
        enableDynamicSizing={false}
        ref={searchSheetRef}
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
              if (searchSheetRef.current && isMinimised) searchSheetRef.current.snapToIndex(1)
            }}
            style={{
              paddingTop: s.$2,
              paddingBottom: s.$2,
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
                <Pressable
                  onPress={() =>
                    setAddingTo(user?.items && user.items?.length < 12 ? 'grid' : 'backlog')
                  }
                >
                  <Ionicons name="add-circle-outline" size={s.$4} color={c.white} />
                </Pressable>
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
            </XStack>
          </Pressable>
          {!isMinimised && searchTerm !== '' && (
            <BottomSheetScrollView style={{ maxHeight: 300 }} keyboardShouldPersistTaps="handled">
              <YStack>
                <Pressable onPress={() => onAddFromSearch()}>
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
                        borderWidth: 1,
                        borderColor: c.white,
                        borderRadius: s.$025,
                      }}
                    >
                      <Text
                        style={{
                          color: c.white,
                          margin: 'auto',
                          fontSize: s.$09,
                          backgroundColor: 'transparent',
                        }}
                      >
                        +
                      </Text>
                    </View>
                    <Heading tag="h2normal" style={{ color: c.white, paddingHorizontal: s.$2 }}>
                      {`Add ${searchTerm}`}
                    </Heading>
                  </XStack>
                </Pressable>
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
            </ScrollView>
          )}
        </BottomSheetView>
      </BottomSheet>
      {(addingTo === 'grid' || addingTo === 'backlog') && (
        <Sheet noPadding={true} full={step !== ''} onChange={(e: any) => e === -1 && stopAdding()}>
          <NewRef
            initialRefData={{ title: newRefTitle }}
            initialStep={initialStep}
            backlog={addingTo === 'backlog'}
            onStep={setStep}
            onNewRef={async (itm: Item) => {
              stopAdding()
            }}
            onCancel={() => {
              stopAdding()
            }}
          />
        </Sheet>
      )}
    </>
  )
}
