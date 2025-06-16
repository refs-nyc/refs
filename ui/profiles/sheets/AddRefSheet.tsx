// add ref sheet

// this takes an existing item and the user can decide whether to add it to their profile or the backlog
// if they add it to their profile, then if the profile is already full, they will have to remove an existing item

// do we make a copy of the item in the database?
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const AddRefSheet = ({
  itemToAdd,
  bottomSheetRef,
  handleCreateNewRef,
}: {
  itemToAdd: ExpandedItem | null
  bottomSheetRef: React.RefObject<BottomSheet>
  handleCreateNewRef: (itm: ExpandedItem) => Promise<void>
}) => {
  const { addRefSheetBackdropAnimatedIndex, registerBackdropPress, unregisterBackdropPress } =
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

  const [addingTo, setAddingTo] = useState<'backlog' | 'grid' | null>(null)

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={['30%']}
      index={-1}
      animatedIndex={addRefSheetBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: s.$4, paddingTop: 0 }}
      onChange={(i: number) => {
        if (i === -1) setAddingTo(null)
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
      {/* firstly ask "add to backlog" or "add to grid" */}
      {addingTo === null && (
        <View style={{ display: 'flex', flexDirection: 'column', padding: s.$3, gap: s.$1 }}>
          <Button
            title="Add to backlog"
            onPress={() => {
              setAddingTo('backlog')
            }}
            variant="basic"
            style={{ backgroundColor: c.surface2 }}
            textStyle={{ color: c.muted2 }}
          />
          <Button
            title="Add to grid"
            onPress={() => {
              setAddingTo('grid')
            }}
            variant="raised"
          />
        </View>
      )}
      {addingTo === 'backlog' && (
        <View style={{ display: 'flex', flexDirection: 'column', padding: s.$3, gap: s.$1 }}>
          <Text>Add to backlog</Text>
        </View>
      )}
      {addingTo === 'grid' && (
        <View style={{ display: 'flex', flexDirection: 'column', padding: s.$3, gap: s.$1 }}>
          <Text>Add to grid</Text>
        </View>
      )}
    </BottomSheet>
  )
}
