import { useCallback, useMemo, useRef, useState } from 'react'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { Text, View } from 'react-native'
import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { Button } from '@/ui/buttons/Button'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

export const DeleteAccountSheet = () => {
  const deleteAccountSheetRef = useAppStore((state) => state.deleteAccountSheetRef)
  const closeDeleteAccountSheet = useAppStore((state) => state.closeDeleteAccountSheet)
  const settingsSheetRef = useAppStore((state) => state.settingsSheetRef)
  const setIsSettingsSheetOpen = useAppStore((state) => state.setIsSettingsSheetOpen)
  const deleteAccount = useAppStore((state) => state.deleteAccount)
  const showToast = useAppStore((state) => state.showToast)
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sheetOpenedRef = useRef(false)

  const snapPoints = useMemo(() => ['45%'], [])

  const resetState = useCallback(() => {
    setPassword('')
    setSubmitting(false)
    setError(null)
    sheetOpenedRef.current = false
  }, [])

  const handleCancel = useCallback(() => {
    closeDeleteAccountSheet()
  }, [closeDeleteAccountSheet])

  const handleDelete = useCallback(async () => {
    if (submitting) return

    try {
      setSubmitting(true)
      setError(null)
      await deleteAccount({ password })
      closeDeleteAccountSheet()
      settingsSheetRef.current?.close()
      setIsSettingsSheetOpen(false)
      showToast('Account deleted')
      router.replace('/user/login')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to delete your account right now.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }, [
    closeDeleteAccountSheet,
    deleteAccount,
    password,
    router,
    setIsSettingsSheetOpen,
    settingsSheetRef,
    showToast,
    submitting,
  ])

  return (
    <BottomSheet
      ref={deleteAccountSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50 }}
      onChange={(index) => {
        if (index === -1 && sheetOpenedRef.current) {
          resetState()
        } else if (index >= 0) {
          sheetOpenedRef.current = true
        }
      }}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: s.$2,
          paddingTop: s.$2,
          paddingBottom: Math.max(insets.bottom, s.$2),
          gap: s.$1 + s.$05,
        }}
      >
        <View style={{ gap: s.$05 }}>
          <Text style={{ color: c.muted2, fontSize: 18, fontWeight: '700' }}>Delete account</Text>
          <Text style={{ color: c.muted, fontSize: 14, lineHeight: 20 }}>
            This will permanently remove your profile, refs, conversations, and cached data. This
            action cannot be undone.
          </Text>
        </View>

        <View style={{ gap: s.$05 }}>
          <Text style={{ color: c.muted2, fontSize: 13, fontWeight: '600' }}>Confirm password</Text>
          <BottomSheetTextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="rgba(0,0,0,0.35)"
            secureTextEntry
            style={{
              borderRadius: s.$1,
              borderWidth: 1,
              borderColor: c.grey1,
              paddingHorizontal: s.$1,
              paddingVertical: 12,
              fontSize: 16,
              color: c.muted2,
            }}
            editable={!submitting}
          />
        </View>

        {error && (
          <Text style={{ color: '#C04444', fontSize: 13, lineHeight: 18 }}>
            {error}
          </Text>
        )}

        <View style={{ gap: s.$05 }}>
          <Button
            title={submitting ? 'Deleting…' : 'Delete account'}
            variant="raised"
            onPress={handleDelete}
            disabled={submitting || password.trim().length === 0}
            style={{
              backgroundColor: '#C04444',
              borderRadius: s.$12,
              opacity: submitting ? 0.7 : 1,
            }}
          />
          <Button
            title="Cancel"
            variant="raisedSecondary"
            onPress={handleCancel}
            disabled={submitting}
            style={{ borderRadius: s.$12 }}
          />
        </View>

        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>
          We schedule deletions immediately and start removing data right away. It may take a few
          minutes for the process to complete across all services.
        </Text>
      </BottomSheetView>
    </BottomSheet>
  )
}
