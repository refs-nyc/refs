import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import type { ExpandedItem, ExpandedProfile } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import BacklogList from '@/ui/profiles/BacklogList'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useState } from 'react'
import { Pressable } from 'react-native'
import { SheetHandle } from '@/ui/core/SheetHandle'

export const OtherBacklogSheet = ({
  bottomSheetRef,
  backlogItems,
  profile,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
  backlogItems: ExpandedItem[]
  profile: ExpandedProfile
}) => {
  const { otherProfileBackdropAnimatedIndex, registerBackdropPress, unregisterBackdropPress } =
    useBackdropStore()

  // close the new ref sheet when the user taps the navigation backdrop
  useEffect(() => {
    const key = registerBackdropPress(() => {
      bottomSheetRef.current?.close()
    })
    return () => {
      unregisterBackdropPress(key)
    }
  }, [])

  const [index, setIndex] = useState(-1)

  const disappearsOnIndex = -1
  const appearsOnIndex = 0

  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={['50%', '90%']}
      index={-1}

      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      keyboardBehavior="interactive"
      onChange={(i: number) => {
        setIndex(i)
      }}
      handleComponent={null}
    >
      <Pressable
        style={{
          // handle is hidden while minimised, so this is needed to make sure
          // the "My backlog" heading doesn't shift around when opening/closing the sheet
          paddingTop: HANDLE_HEIGHT + 8,
          paddingBottom: s.$2 + s.$05,
        }}
      >
        <Heading tag="h2normal" style={{ color: c.white, paddingHorizontal: s.$2 }}>
          {`${profile.firstName}'s Backlog`}
        </Heading>
      </Pressable>
      {index >= 0 && <BacklogList items={backlogItems.toReversed()} ownProfile={false} />}
    </BottomSheet>
  )
}
