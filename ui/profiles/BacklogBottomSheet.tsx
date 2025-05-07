import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useCallback, useRef, useState } from 'react'
import { Pressable, View, Text } from 'react-native'
import { Heading } from '../typo/Heading'
import { XStack } from '../core/Stacks'

export default function BacklogBottomSheet({
  onAddToBacklogClick,
}: {
  onAddToBacklogClick: () => void
}) {
  const [index, setIndex] = useState(0)
  const backlogSheetRef = useRef<BottomSheet>(null)

  const renderBackdrop = useCallback(
    (p: any) => (
      <BottomSheetBackdrop
        {...p}
        disappearsOnIndex={0}
        appearsOnIndex={1}
        pressBehavior={'collapse'}
      />
    ),
    []
  )

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={backlogSheetRef}
      enablePanDownToClose={false}
      snapPoints={['15%', '50%']}
      onChange={(i: number) => setIndex(i)}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{
        width: s.$13,
        height: s.$075,
        backgroundColor: index < 1 ? 'transparent' : c.white,
      }}
    >
      <Pressable
        onPress={() => {
          if (backlogSheetRef.current) backlogSheetRef.current.snapToIndex(1)
        }}
        style={{ height: s.$7 }}
      >
        <XStack
          gap={s.$075}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: s.$2,
          }}
        >
          <Heading
            tag="h2normal"
            style={{
              color: c.white,
              // flex: 1,
            }}
          >
            My Backlog
          </Heading>
          <View
            style={{
              height: 1,
              flex: 1,
              backgroundColor: c.white,
            }}
          ></View>
          <Pressable
            onPress={onAddToBacklogClick}
            style={{
              borderRadius: s.$10,
              borderWidth: 1,
              borderColor: c.white,
              width: s.$3,
              height: s.$3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: c.white, fontSize: s.$1, lineHeight: s.$1 }}>+</Text>
          </Pressable>
        </XStack>
      </Pressable>
    </BottomSheet>
  )
}
