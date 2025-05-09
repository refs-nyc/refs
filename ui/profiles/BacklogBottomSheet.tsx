import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useCallback, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { Heading } from '../typo/Heading'
import { XStack } from '../core/Stacks'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export default function BacklogBottomSheet({
  children,
  onAddToBacklogClick,
}: {
  children?: React.ReactNode
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

  const renderHandle = () => {
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          display: index < 1 ? 'none' : 'flex',
          height: s.$3,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{ backgroundColor: c.white, width: s.$5, height: s.$05, borderRadius: s.$10 }}
        />
      </View>
    )
  }

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={backlogSheetRef}
      enablePanDownToClose={false}
      snapPoints={['15%', '80%']}
      onChange={(i: number) => setIndex(i)}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
    >
      <Pressable
        onPress={() => {
          if (backlogSheetRef.current) backlogSheetRef.current.snapToIndex(1)
        }}
        style={{ paddingTop: index < 1 ? s.$3 : 0, paddingBottom: index < 1 ? s.$6 : s.$1 }}
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
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add-circle-outline" size={s.$4} color={c.white} />
          </Pressable>
        </XStack>
      </Pressable>
      {index > 0 && children}
    </BottomSheet>
  )
}
