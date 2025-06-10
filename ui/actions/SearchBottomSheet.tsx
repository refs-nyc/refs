import { c, s } from '@/features/style'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet'
import { useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Heading } from '../typo/Heading'
import { XStack, YStack } from '../core/Stacks'
import { Button } from '../buttons/Button'
import { getProfileItems } from '@/features/pocketbase/stores/items'
import { CompleteRef, Item, Profile } from '@/features/pocketbase/stores/types'
import { pocketbase, useUserStore } from '@/features/pocketbase'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { NewRef, NewRefStep } from './NewRef'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'

const HEADER_HEIGHT = s.$8

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

  const { moduleBackdropAnimatedIndex } = useBackdropStore()

  const onAddRefToSearch = (r: CompleteRef) => {
    setRefs((prevState) => [...prevState.filter((ref) => ref.id !== r.id), r])
    setSearchTerm('')
    updateSearch('')
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

  const onAddFromSearch = async () => {
    if (!user?.userName) return
    setInitialStep('add')
    setNewRefTitle(searchTerm)
    const gridItems = await getProfileItems(user.userName)
    setAddingTo(gridItems.length < 12 ? 'grid' : 'backlog')
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

  const isAddingNewRef = addingTo === 'grid' || addingTo === 'backlog'

  let snapPoints: (string | number)[] = []
  if (isAddingNewRef) {
    if (step === 'add' || step === 'categorise') {
      snapPoints = ['1%', '80%']
    } else if (step === 'addToList') {
      snapPoints = ['1%', '70%']
    } else if (step === 'editList') {
      snapPoints = ['1%', '70%']
    } else if (addingTo === 'grid' && step === '') {
      snapPoints = ['1%', '35%']
    } else {
      snapPoints = ['1%', '35%']
    }
  } else {
    // search console should expand when new refs are added to the search
    // but it shouldn't be taller than ~4 refs in its minimised form
    const refHeightPlusGap = s.$3 + s.$1
    const minSnapPoint = refHeightPlusGap * Math.min(refs.length, 4) + s.$1 + HEADER_HEIGHT
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
        animatedIndex={moduleBackdropAnimatedIndex}
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
          <BottomSheetView>
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
                    style={{ fontSize: s.$1, color: c.white, minWidth: '50%' }}
                    onChangeText={updateSearch}
                    value={searchTerm}
                  />
                )}
                <XStack gap={s.$05} style={{ alignItems: 'center' }}>
                  <Pressable
                    onPress={async () => {
                      if (!user?.userName) return
                      const gridItems = await getProfileItems(user.userName)
                      setAddingTo(gridItems.length < 12 ? 'grid' : 'backlog')
                      setIndex(1)
                    }}
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
        )}
      </BottomSheet>
    </>
  )
}
