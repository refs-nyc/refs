import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useCallback } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function Saves({
  savesBottomSheetRef,
}: {
  savesBottomSheetRef: React.RefObject<BottomSheet>
}) {
  const insets = useSafeAreaInsets()
  const renderBackdrop = useCallback(
    (p: any) => <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  return (
    <BottomSheet
      ref={savesBottomSheetRef}
      index={-1}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      snapPoints={['80%']}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50 }}
      handleComponent={null}
      // handleIndicatorStyle={{ width: s.$13, height: s.$075, backgroundColor: c.white }}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: s.$2,
          paddingTop: s.$2,
          paddingBottom: insets.bottom + (s.$2 as number),
          justifyContent: 'center',
          gap: s.$1,
        }}
      >
        <Text style={{ fontSize: (s.$09 as number) + 6, fontWeight: '700', color: c.prompt }}>
          Notifications
        </Text>
        <Text style={{ color: c.muted, fontSize: s.$09 }}>
          You’re all caught up for now. We’ll drop updates here as soon as there’s something new for
          you to check out.
        </Text>
      </View>
    </BottomSheet>
  )
}
