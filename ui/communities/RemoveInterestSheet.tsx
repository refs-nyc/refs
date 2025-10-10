import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useCallback } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const RemoveInterestSheet = () => {
  const insets = useSafeAreaInsets()
  const {
    removeRefSheetBackdropAnimatedIndex,
    registerBackdropPress,
    unregisterBackdropPress,
    removeInterestSheetRef,
    pendingInterestRemoval,
    setPendingInterestRemoval,
  } = useAppStore()

  const handleConfirm = useCallback(() => {
    if (!pendingInterestRemoval) return
    
    removeInterestSheetRef.current?.close()
    
    // Wait for sheet to close before executing
    setTimeout(() => {
      pendingInterestRemoval.onConfirm()
      setPendingInterestRemoval(null)
    }, 200)
  }, [pendingInterestRemoval, setPendingInterestRemoval, removeInterestSheetRef])

  // close the sheet when the user taps the navigation backdrop
  useEffect(() => {
    const key = registerBackdropPress(() => {
      removeInterestSheetRef.current?.close()
    })
    return () => {
      unregisterBackdropPress(key)
    }
  }, [])

  const disappearsOnIndex = -1
  const appearsOnIndex = 0

  const interestTitle = pendingInterestRemoval?.title || ''
  const isOwner = pendingInterestRemoval?.isOwner || false

  return (
    <BottomSheet
      enableDynamicSizing={true}
      ref={removeInterestSheetRef}
      enablePanDownToClose={true}
      index={-1}
      animatedIndex={removeRefSheetBackdropAnimatedIndex}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50, paddingTop: 0, opacity: 1 }}
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
      style={{ zIndex: 10000 }}
      containerStyle={{ zIndex: 10000 }}
    >
      <YStack
        gap={s.$2}
        style={{ paddingHorizontal: s.$2, paddingTop: s.$3, paddingBottom: insets.bottom || s.$2 }}
      >
        <XStack style={{ justifyContent: 'center' }}>
          <Heading tag="h2semi" style={{ color: c.muted, textAlign: 'center' }}>
            {isOwner ? 'Delete ' : 'Leave '}
            <Heading tag="h2semi" style={{ color: c.black, textAlign: 'center' }}>
              {interestTitle}
            </Heading>
            ?
          </Heading>
        </XStack>
        <YStack gap={s.$1 + s.$05}>
          <Button
            onPress={handleConfirm}
            title={isOwner ? 'Delete' : 'Leave'}
            variant={isOwner ? 'basic' : 'raisedSecondary'}
            style={{ minHeight: 50 }}
          />
        </YStack>
      </YStack>
    </BottomSheet>
  )
}

