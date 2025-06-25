import { c, s } from '@/features/style'
import { NewRef } from '@/ui/actions/NewRef'
import { useUIStore } from '@/ui/state'
import { useItemStore } from '@/features/pocketbase/stores/items'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const NewRefSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const { triggerProfileRefresh } = useItemStore()
  const { addingNewRefTo, setAddingNewRefTo } = useUIStore()

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  const isOpen = addingNewRefTo !== null

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={['40%', '90%']}
      index={-1}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      onChange={(i: number) => {
        if (i === -1) setAddingNewRefTo(null)
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
          backlog={addingNewRefTo === 'backlog'}
          onNewRef={(newItem) => {
            console.log('created new item', newItem)
            triggerProfileRefresh()
            setAddingNewRefTo(null)
            bottomSheetRef.current?.close()

            // if we are adding to the grid, we need to display the details modal for the new item
            if (addingNewRefTo === 'grid') {
              // TODO: implement this
              // detailsSheetRef.current?.snapToIndex(0)
            }
          }}
          onCancel={() => {
            bottomSheetRef.current?.close()
          }}
        />
      )}
    </BottomSheet>
  )
}
