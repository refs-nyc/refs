import { c, s } from '@/features/style'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useCallback } from 'react'
import { View, Text } from 'react-native'

export default function Saves({
  savesBottomSheetRef,
}: {
  savesBottomSheetRef: React.RefObject<BottomSheet>
}) {
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
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50 }}
      handleComponent={null}
      // handleIndicatorStyle={{ width: s.$13, height: s.$075, backgroundColor: c.white }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: s.$2 }}>
        <Text style={{ color: c.surface, fontSize: (s.$09 as number) + 2, fontWeight: '600' }}>
          Coming soon
        </Text>
      </View>
    </BottomSheet>
  )
}
