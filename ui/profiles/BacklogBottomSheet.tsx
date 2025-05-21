import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { RefObject, useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Heading } from '../typo/Heading'
import { XStack } from '../core/Stacks'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { Profile } from '@/features/pocketbase/stores/types'
import { useUserStore } from '@/features/pocketbase'

export default function BacklogBottomSheet({
  children,
  onAddToBacklogClick,
  backlogSheetRef,
  profile,
}: {
  children?: React.ReactNode
  onAddToBacklogClick: () => void
  backlogSheetRef: RefObject<BottomSheet>
  profile: Profile
}) {
  const [index, setIndex] = useState(0)
  const { user } = useUserStore()

  const ownProfile = profile.id === user?.id
  const isMinimised = ownProfile && index === 0
  const HANDLE_HEIGHT = s.$2

  const renderBackdrop = useCallback(
    (p: any) => (
      <BottomSheetBackdrop
        {...p}
        disappearsOnIndex={ownProfile ? 0 : -1}
        appearsOnIndex={ownProfile ? 1 : 0}
        pressBehavior={ownProfile ? 'collapse' : 'close'}
      />
    ),
    [ownProfile]
  )

  const renderHandle = () => {
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          display: isMinimised ? 'none' : 'flex',
          height: HANDLE_HEIGHT,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{ backgroundColor: c.white, width: s.$5, height: s.$05, borderRadius: s.$10 }}
        />
      </View>
    )
  }

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={backlogSheetRef}
      index={ownProfile ? 0 : -1}
      enablePanDownToClose={!ownProfile}
      snapPoints={ownProfile ? ['15%', '80%'] : ['80%']}
      onChange={(i: number) => setIndex(i)}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
    >
      <Pressable
        onPress={() => {
          if (backlogSheetRef.current && isMinimised) backlogSheetRef.current.snapToIndex(1)
        }}
        style={{
          // handle is hidden while minimised, so this is needed to make sure 
          // the "My backlog" heading doesn't shift around when opening/closing the sheet
          paddingTop: isMinimised ? HANDLE_HEIGHT : 0, 
          paddingBottom: isMinimised ? s.$6 : s.$1,
        }}
      >
        {ownProfile ? (
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
              onPress={onAddToBacklogClick}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add-circle-outline" size={s.$4} color={c.white} />
            </Pressable>
          </XStack>
        ) : (
          <Heading tag="h2normal" style={{ color: c.white, paddingHorizontal: s.$2 }}>
            {`${profile.firstName}'s Library`}
          </Heading>
        )}
      </Pressable>
      {!isMinimised && children}
    </BottomSheet>
  )
}
