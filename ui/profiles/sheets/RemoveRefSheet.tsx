import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { XStack, YStack } from '@/ui/core/Stacks'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useState } from 'react'
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
  const { removeRefSheetBackdropAnimatedIndex } = useBackdropStore()

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
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: s.$4, paddingTop: 0 }}
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
              backgroundColor: c.black,
              width: s.$5,
              height: s.$05,
              borderRadius: s.$10,
            }}
          />
        </View>
      )}
      keyboardBehavior="interactive"
    >
      <YStack gap={s.$2} style={{ paddingHorizontal: s.$2, paddingVertical: s.$3 }}>
        <XStack style={{ justifyContent: 'center' }}>
          <Heading tag="h2light" style={{ color: c.muted }}>
            Do what with {item?.expand.ref?.title}?
          </Heading>
        </XStack>
        <YStack gap={s.$1 + s.$05}>
          <Button onPress={handleRemoveFromProfile} title="Remove" variant="basic" />
          <Button onPress={handleMoveToBacklog} title={`Send to Backlog`} variant="fluid" />
        </YStack>
      </YStack>
    </BottomSheet>
  )
}
