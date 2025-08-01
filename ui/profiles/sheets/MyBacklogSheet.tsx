import { useAppStore } from '@/features/stores'
import type { ExpandedItem, Profile } from '@/features/types'
import { c, s } from '@/features/style'
import { XStack } from '@/ui/core/Stacks'
import BacklogList from '@/ui/profiles/BacklogList'
import { Heading } from '@/ui/typo/Heading'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'

export const MyBacklogSheet = ({
  backlogItems,
  profile,
  user,
  openAddtoBacklog,
}: {
  backlogItems: ExpandedItem[]
  profile: Profile
  user: Profile | null
  openAddtoBacklog: () => void
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null)
  const [index, setIndex] = useState(0)

  const { moduleBackdropAnimatedIndex, registerBackdropPress, unregisterBackdropPress } =
    useAppStore()

  // close the new ref sheet when the user taps the navigation backdrop
  useEffect(() => {
    // Only register backdrop press when sheet is visible
    if (index > -1) {
      const key = registerBackdropPress(() => {
        bottomSheetRef.current?.close()
      })
      return () => {
        unregisterBackdropPress(key)
      }
    }
  }, [index])

  const disappearsOnIndex = 0
  const appearsOnIndex = 1
  const isMinimised = index === 0
  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      snapPoints={['15%', '90%']}
      index={-1}
      enablePanDownToClose={true}
      animatedIndex={index > -1 ? moduleBackdropAnimatedIndex : undefined}
      onChange={(i: number) => {
        setIndex(i)
      }}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'collapse'}
        />
      )}
      handleComponent={null}
      keyboardBehavior="interactive"
    >
      <Pressable
        onPress={() => {
          if (bottomSheetRef.current && isMinimised) bottomSheetRef.current.snapToIndex(1)
        }}
        style={{
          paddingTop: HANDLE_HEIGHT,
          paddingBottom: s.$2 - 8,
        }}
      >
        <XStack
          gap={s.$075}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: s.$2,
          }}
        >
          <Heading tag="h2normal" style={{ color: c.white }}>
            My Backlog
          </Heading>
          <View style={{ height: 1, flex: 1, backgroundColor: c.white }}></View>
          <Pressable
            onPress={() => {
              bottomSheetRef.current?.collapse()
              openAddtoBacklog()
            }}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add-circle-outline" size={s.$4} color={c.white} />
          </Pressable>
        </XStack>
      </Pressable>

      {!isMinimised && (
        <BacklogList items={backlogItems.toReversed()} ownProfile={profile.id === user?.id} />
      )}
    </BottomSheet>
  )
}
