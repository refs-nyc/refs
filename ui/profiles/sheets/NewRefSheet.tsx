import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { NewRef } from '@/ui/actions/NewRef'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const NewRefSheet = ({
  addingTo,
  bottomSheetRef,
  handleCreateNewRef,
  onClose,
}: {
  addingTo: '' | 'grid' | 'backlog'
  bottomSheetRef: React.RefObject<BottomSheet>
  handleCreateNewRef: (itm: ExpandedItem) => Promise<void>
  onClose: () => void
}) => {
  const { newRefSheetBackdropAnimatedIndex } = useBackdropStore()

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  const isOpen = addingTo !== ''

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={['40%', '90%']}
      index={-1}
      animatedIndex={newRefSheetBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      onChange={(i: number) => {
        if (i === -1) onClose()
      }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      handleComponent={() => (
        <View
          style={{
            width: '100%',
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
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
      {isOpen && (
        <NewRef
          backlog={addingTo === 'backlog'}
          onStep={(step) => {
            if (step === 'add') bottomSheetRef.current?.snapToIndex(1)
          }}
          onNewRef={handleCreateNewRef}
          onCancel={() => {
            bottomSheetRef.current?.close()
          }}
        />
      )}
    </BottomSheet>
  )
}
