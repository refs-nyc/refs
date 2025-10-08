import React, { useCallback } from 'react'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { Button } from '@/ui/buttons/Button'
import { c, s } from '@/features/style'
import { useAppStore } from '@/features/stores'

export function LogoutSheet({ bottomSheetRef }: { bottomSheetRef: React.RefObject<BottomSheet> }) {
  const { logout } = useAppStore()

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />, 
    []
  )

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={[160]}
      enablePanDownToClose
      enableDynamicSizing={false}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 28 }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: s.$4,
          gap: s.$3,
        }}
      >
        <Button
          title="Log out"
          onPress={() => {
            bottomSheetRef.current?.close()
            logout()
          }}
          textStyle={{ fontWeight: '700' }}
        />
      </BottomSheetView>
    </BottomSheet>
  )
}
