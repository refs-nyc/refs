import { useEffect, useMemo, useRef, useCallback } from 'react'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import { Keyboard, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAppStore } from '@/features/stores'
import { RefForm } from '@/ui/actions/RefForm'
import { c, s } from '@/features/style'
import type { StagedItemFields } from '@/features/types'
import Ionicons from '@expo/vector-icons/Ionicons'

export const DirectPhotoSheet = () => {
  const directPhotoSheetVisible = useAppStore((state) => state.directPhotoSheetVisible)
  const directPhotoRefFields = useAppStore((state) => state.directPhotoRefFields)
  const closeDirectPhotoSheet = useAppStore((state) => state.closeDirectPhotoSheet)
  const directPhotoBackdropAnimatedIndex = useAppStore((state) => state.directPhotoBackdropAnimatedIndex)
  const registerBackdropPress = useAppStore((state) => state.registerBackdropPress)
  const unregisterBackdropPress = useAppStore((state) => state.unregisterBackdropPress)
  const addToProfile = useAppStore((state) => state.addToProfile)

  const sheetRef = useRef<BottomSheet>(null)
  const insets = useSafeAreaInsets()

  const snapPoints = useMemo(() => ['80%', '90%', '100%'], [])

  useEffect(() => {
    if (directPhotoSheetVisible) {
      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(0)
      })
    } else {
      sheetRef.current?.close()
    }
  }, [directPhotoSheetVisible])

  const handleClose = useCallback(() => {
    Keyboard.dismiss()
    closeDirectPhotoSheet()
  }, [closeDirectPhotoSheet])

  useEffect(() => {
    if (!directPhotoSheetVisible) return
    const key = registerBackdropPress(handleClose)
    return () => {
      unregisterBackdropPress(key)
    }
  }, [directPhotoSheetVisible, handleClose, registerBackdropPress, unregisterBackdropPress])

  if (!directPhotoSheetVisible || !directPhotoRefFields) {
    return null
  }

  const handleSubmit = async (fields: StagedItemFields) => {
    const merged = {
      ...fields,
      promptContext: directPhotoRefFields.promptContext,
      title: fields.title || directPhotoRefFields.promptContext || 'Untitled',
    }
    try {
      await addToProfile(null, merged, false)
      handleClose()
    } catch (error) {
      console.error('[direct-photo] addToProfile failed', error)
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      index={-1}
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      handleComponent={null}
      animatedIndex={directPhotoBackdropAnimatedIndex}
      style={{ zIndex: 10000 }}
      containerStyle={{ zIndex: 10000 }}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      onChange={(idx) => {
        if (idx === -1) {
          handleClose()
        }
      }}
    >
      <BottomSheetView
        style={{
          paddingTop: s.$2,
          paddingHorizontal: s.$2,
          paddingBottom: insets.bottom + s.$2,
          flex: 1,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: s.$1 }}>
          <View
            style={{
              width: 42,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(0,0,0,0.25)',
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close direct photo sheet"
            onPress={handleClose}
            hitSlop={10}
            style={{
              position: 'absolute',
              right: 0,
              top: -4,
              padding: 6,
            }}
          >
            <Ionicons name="close-outline" size={22} color={c.newDark} />
          </Pressable>
        </View>
        <RefForm
          key={`direct-photo-form-${directPhotoRefFields.image}`}
          existingRefFields={directPhotoRefFields}
          pickerOpen={false}
          canEditRefData
          bottomInset={insets.bottom}
          onAddRef={handleSubmit}
          onAddRefToList={handleSubmit}
          backlog={false}
        />
      </BottomSheetView>
    </BottomSheet>
  )
}
