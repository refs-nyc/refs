import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import type { ExpandedItem, ExpandedProfile } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import BacklogList from '@/ui/profiles/BacklogList'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { Pressable } from 'react-native'

export const OtherBacklogSheet = ({
  bottomSheetRef,
  backlogItems,
  profile,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
  backlogItems: ExpandedItem[]
  profile: ExpandedProfile
}) => {
  const { moduleBackdropAnimatedIndex } = useBackdropStore()

  const disappearsOnIndex = 0
  const appearsOnIndex = 1

  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={false}
      snapPoints={['1%', '50%', '90%']}
      index={0}
      animatedIndex={moduleBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      keyboardBehavior="interactive"
    >
      <Pressable
        style={{
          // handle is hidden while minimised, so this is needed to make sure
          // the "My backlog" heading doesn't shift around when opening/closing the sheet
          paddingTop: HANDLE_HEIGHT,
          paddingBottom: s.$2 + s.$05,
        }}
      >
        <Heading tag="h2normal" style={{ color: c.white, paddingHorizontal: s.$2 }}>
          {`${profile.firstName}'s Backlog`}
        </Heading>
      </Pressable>
      <BacklogList items={backlogItems.toReversed()} ownProfile={false} />
    </BottomSheet>
  )
}
