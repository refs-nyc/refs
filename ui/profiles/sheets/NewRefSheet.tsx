import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { NewRef } from '@/ui/actions/NewRef'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const NewRefSheet = ({
  backlog,
  bottomSheetRef,
  handleCreateNewRef,
}: {
  backlog: boolean
  bottomSheetRef: React.RefObject<BottomSheet>
  handleCreateNewRef: (itm: ExpandedItem) => Promise<void>
}) => {
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
      snapPoints={['1%', '30%', '90%']}
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
      <NewRef
        backlog={backlog}
        onStep={(step) => {
          if (step === 'add') bottomSheetRef.current?.snapToIndex(2)
        }}
        onNewRef={handleCreateNewRef}
        onCancel={() => {
          bottomSheetRef.current?.snapToIndex(0)
        }}
      />
    </BottomSheet>
  )
}
