import { c, s } from '@/features/style'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import { useRef, useState, useEffect } from 'react'
import { Pressable, Text, TextInput, ScrollView, StyleSheet } from 'react-native'
import { Heading } from '../typo/Heading'
import { XStack, YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { CompleteRef, Item, Profile } from '@/features/pocketbase/stores/types'
import { pocketbase, useUserStore } from '@/features/pocketbase'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { NewRef, NewRefStep } from './NewRef'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const HEADER_HEIGHT = s.$8

export default function SearchBottomSheet({ selectedRefs, setSelectedRefs }: { selectedRefs: any[], setSelectedRefs: (refs: any[]) => void }) {
  const [index, setIndex] = useState(0)
  const isMinimised = index === 0
  const searchSheetRef = useRef<BottomSheet>(null)
  const [addingTo, setAddingTo] = useState('')
  const [step, setStep] = useState('')
  const [newRefTitle, setNewRefTitle] = useState('')
  const [initialStep, setInitialStep] = useState<NewRefStep>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<CompleteRef[]>([])
  const { user } = useUserStore()
  const { animatedIndex } = useBackdropStore()
  const [error, setError] = useState('')
  const insets = useSafeAreaInsets()

  // Helper: check if a ref is already selected
  const isRefSelected = (title: string) => selectedRefs.some(r => r.title && r.title.toLowerCase() === title.toLowerCase())

  // When user tries to add a ref manually
  const onAddRefToSearch = (r: CompleteRef) => {
    if (!r.title) return;
    if (isRefSelected(r.title)) {
      setError('already added!')
      return
    }
    setSelectedRefs([r, ...selectedRefs.filter((ref: any) => ref.id !== r.id)])
    setSearchTerm('')
    updateSearch('')
    setError('')
  }

  // Remove ref from selectedRefs
  const removeRef = (id: string) => {
    setSelectedRefs(selectedRefs.filter((ref: any) => ref.id !== id))
    setError('')
  }

  const updateSearch = async (q: string) => {
    setSearchTerm(q)

    if (q === '') {
      setResults([])
      return
    }
    const refsResults = await pocketbase
      .collection<CompleteRef>('refs')
      .getFullList({ filter: `title ~ "${q}"` })

    setResults(refsResults)
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
    setSelectedRefs([])
  }

  const search = () => {
    router.push(`/search?refs=${selectedRefs.map((r) => r.id).join(',')}`)
    setSelectedRefs([])
  }

  const isAddingNewRef = addingTo === 'grid' || addingTo === 'backlog'

  let snapPoints: (string | number)[] = []
  if (isAddingNewRef) {
    snapPoints = ['1%', '30%', '90%']
  } else {
    // search console should expand when new refs are added to the search
    // but it shouldn't be taller than ~4 refs in its minimised form
    const refHeightPlusGap = s.$3 + s.$1
    const minSnapPoint = refHeightPlusGap * Math.min(selectedRefs.length, 4) + s.$1 + HEADER_HEIGHT
    snapPoints = [minSnapPoint, '90%']
  }

  return (
    <>
      <BottomSheet
        enableDynamicSizing={false}
        ref={searchSheetRef}
        enablePanDownToClose={false}
        snapPoints={snapPoints}
        index={Math.min(index, snapPoints.length - 1)}
        animatedIndex={animatedIndex}
        onChange={(i: number) => {
          setIndex(i)
          if (i === 0) {
            setResults([])
            setSearchTerm('')
            stopAdding()
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
        {addingTo === 'grid' || addingTo === 'backlog' ? (
          <NewRef
            initialRefData={{ title: newRefTitle }}
            initialStep={initialStep}
            backlog={addingTo === 'backlog'}
            onStep={(step) => {
              setStep(step)
              if (step === 'add' && snapPoints.length > 2) searchSheetRef.current?.snapToIndex(2)
            }}
            onNewRef={async (itm: Item) => {
              stopAdding()
              searchSheetRef.current?.collapse()
            }}
            onCancel={() => {
              stopAdding()
              searchSheetRef.current?.collapse()
            }}
          />
        ) : (
          <BottomSheetView style={{ paddingBottom: insets.bottom }}>
            {/* Chips/tags for selected refs (in search area) */}
            {selectedRefs.length > 0 && (
              <YStack style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {selectedRefs.map((r, idx) => (
                  <XStack
                    key={String(r.id || r.title || `ref-chip-${idx}`)}
                    style={{
                      backgroundColor: c.olive,
                      borderRadius: 16,
                      alignItems: 'center',
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      marginRight: 8,
                      marginBottom: 4,
                    }}
                  >
                    <SimplePinataImage
                      originalSource={r.image as string}
                      imageOptions={{ width: 24, height: 24 }}
                      style={{ width: 24, height: 24, borderRadius: 12, marginRight: 6 }}
                    />
                    <Text style={{ color: c.white, fontFamily: 'Inter-Medium', fontSize: 14 }}>
                      {r.title}
                    </Text>
                    <Pressable onPress={() => removeRef(r.id)} style={{ marginLeft: 6 }}>
                      <Ionicons name="close" size={18} color={c.white} />
                    </Pressable>
                  </XStack>
                ))}
              </YStack>
            )}
            {/* Error message */}
            {error && (
              <Text
                style={{
                  color: c.surface,
                  fontFamily: 'Inter-Medium',
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 10,
                  marginBottom: 0,
                }}
              >
                {error}
              </Text>
            )}
            <Pressable
              onPress={() => {
                if (searchSheetRef.current && isMinimised) searchSheetRef.current.snapToIndex(1)
              }}
              style={{
                paddingTop: s.$1,
                paddingBottom: s.$1,
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
                  <TextInput
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
                    onPress={() => {
                      setAddingTo(user?.items && user.items?.length < 12 ? 'grid' : 'backlog')
                      setIndex(1)
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={s.$4} color={c.white} />
                  </Pressable>
                  <Button
                    variant="whiteInverted"
                    title={selectedRefs.length ? 'Search' : 'Stumble'}
                    onPress={selectedRefs.length ? search : stumble}
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
                      <BottomSheetView
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
                      </BottomSheetView>
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
                          originalSource={r.image as string}
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
                  {selectedRefs.map((r) => (
                    <XStack
                      key={String(r.id || r.title || `ref-chip-${selectedRefs.indexOf(r)}`)}
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
                          originalSource={r.image as string}
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
                          removeRef(r.id)
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
        )}
      </BottomSheet>
    </>
  )
}

// Pill styles (copy from Feed or adjust as needed)
const pillStyles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#A5B89F', // Actual Olive
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 38,
    minWidth: 38,
  },
  unselected: {
    backgroundColor: '#F3F2ED', // Surface
  },
  selected: {
    backgroundColor: '#A5B89F', // Actual Olive
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  unselectedText: {
    color: '#A5B89F', // Actual Olive
  },
  selectedText: {
    color: 'rgba(0,0,0,0.54)', // Mellow Black
  },
})
