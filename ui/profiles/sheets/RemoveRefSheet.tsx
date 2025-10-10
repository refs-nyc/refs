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
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const RemoveRefSheet = ({
  bottomSheetRef,
  handleMoveToBacklog,
  handleRemoveFromProfile,
  item,
  onClose,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
  handleMoveToBacklog: () => Promise<void>
  handleRemoveFromProfile: () => Promise<void>
  item: ExpandedItem | null
  onClose: () => void
}) => {
  const insets = useSafeAreaInsets()
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
      snapPoints={[240]}
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
      onChange={(index) => {
        if (index === -1) {
          onClose()
        }
      }}
    >
      <YStack
        gap={s.$2}
        style={{ paddingHorizontal: s.$2, paddingTop: s.$3, paddingBottom: insets.bottom || s.$2 }}
      >
        <XStack style={{ justifyContent: 'center' }}>
          <Heading tag="h2semi" style={{ color: c.muted }}>
            Do what with{' '}
            <Heading tag="h2semi" style={{ color: c.black }}>
              {item?.expand.ref?.title}
            </Heading>
            ?
          </Heading>
        </XStack>
        <YStack gap={s.$1 + s.$05}>
          <Button onPress={handleRemoveFromProfile} title="Remove" variant="basic" style={{ minHeight: 50 }} />
          <Button onPress={handleMoveToBacklog} title={`Send to Backlog`} style={{ minHeight: 50 }} />
        </YStack>
      </YStack>
    </BottomSheet>
  )
}
