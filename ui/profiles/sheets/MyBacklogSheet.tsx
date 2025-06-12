import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { UsersRecord } from '@/features/pocketbase/stores/pocketbase-types'
import type { ExpandedItem, ExpandedProfile } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { XStack } from '@/ui/core/Stacks'
import BacklogList from '@/ui/profiles/BacklogList'
import { Heading } from '@/ui/typo/Heading'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const MyBacklogSheet = ({
  backlogItems,
  profile,
  user,
  openAddtoBacklog,
}: {
  backlogItems: ExpandedItem[]
  profile: ExpandedProfile
  user: UsersRecord | null
  openAddtoBacklog: () => void
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null)
  const { moduleBackdropAnimatedIndex } = useBackdropStore()
  const [index, setIndex] = useState(0)

  const disappearsOnIndex = 0
  const appearsOnIndex = 1
  const isMinimised = index === 0
  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={false}
      snapPoints={['15%', '90%']}
      index={0}
      animatedIndex={moduleBackdropAnimatedIndex}
      onChange={(i: number) => {
        setIndex(i)
      }}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'collapse'}
        />
      )}
      handleComponent={() => (
        <View
          style={{
            width: '100%',
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            display: isMinimised ? 'none' : 'flex',
            height: HANDLE_HEIGHT,
          }}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={{
              backgroundColor: c.white,
              width: s.$5,
              height: s.$05,
              borderRadius: s.$10,
            }}
          />
        </View>
      )}
      keyboardBehavior="interactive"
    >
      <Pressable
        onPress={() => {
          if (bottomSheetRef.current && isMinimised) bottomSheetRef.current.snapToIndex(1)
        }}
        style={{
          // handle is hidden while minimised, so this is needed to make sure
          // the "My backlog" heading doesn't shift around when opening/closing the sheet
          paddingTop: HANDLE_HEIGHT,
          paddingBottom: s.$2 + s.$05,
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
      <BacklogList items={backlogItems.toReversed()} ownProfile={profile.id === user?.id} />
    </BottomSheet>
  )
}
