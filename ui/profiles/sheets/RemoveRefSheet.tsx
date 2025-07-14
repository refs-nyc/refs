import { useAppStore } from '@/features/stores'
import { ExpandedItem } from '@/features/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const RemoveRefSheet = ({
  bottomSheetRef,
  handleMoveToBacklog,
  handleRemoveFromProfile,
  item,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
  handleMoveToBacklog: () => Promise<void>
  handleRemoveFromProfile: () => Promise<void>
  item: ExpandedItem | null
}) => {
  const { removeRefSheetBackdropAnimatedIndex, registerBackdropPress, unregisterBackdropPress } =
    useAppStore()

  // close the new ref sheet when the user taps the navigation backdrop
  useEffect(() => {
    const key = registerBackdropPress(() => {
      bottomSheetRef.current?.close()
    })
    return () => {
      unregisterBackdropPress(key)
    }
  }, [])

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={['35%']}
      index={-1}
      animatedIndex={removeRefSheetBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50, paddingTop: 0 }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      handleComponent={null}
      keyboardBehavior="interactive"
    >
      <YStack
        gap={s.$2}
        style={{ paddingHorizontal: s.$2, paddingVertical: s.$3, paddingTop: s.$3 + 8 }}
      >
        <XStack style={{ justifyContent: 'center' }}>
          <Heading tag="h2light" style={{ color: c.muted }}>
            Do what with {item?.expand.ref?.title}?
          </Heading>
        </XStack>
        <YStack gap={s.$1 + s.$05}>
          <Button onPress={handleRemoveFromProfile} title="Remove" variant="basic" />
          <Button onPress={handleMoveToBacklog} title={`Send to Backlog`} />
        </YStack>
      </YStack>
    </BottomSheet>
  )
}
