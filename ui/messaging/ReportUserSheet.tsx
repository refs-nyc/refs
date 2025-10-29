import { useCallback, useMemo, useRef, useState } from 'react'
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet'
import { Alert, Pressable, Switch, Text, View } from 'react-native'
import { Avatar } from '@/ui/atoms/Avatar'
import { Button } from '@/ui/buttons/Button'
import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam or scam' },
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'hate', label: 'Hate or discrimination' },
  { key: 'inappropriate', label: 'Inappropriate content' },
  { key: 'other', label: 'Something else' },
] as const

export const ReportUserSheet = () => {
  const reportSheetRef = useAppStore((state) => state.reportSheetRef)
  const reportSheetContext = useAppStore((state) => state.reportSheetContext)
  const closeReportSheet = useAppStore((state) => state.closeReportSheet)
  const submitUserReport = useAppStore((state) => state.submitUserReport)
  const showToast = useAppStore((state) => state.showToast)
  const insets = useSafeAreaInsets()

  const [reason, setReason] = useState<string>(REPORT_REASONS[0].key)
  const [details, setDetails] = useState('')
  const [includeMessages, setIncludeMessages] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openedRef = useRef(false)

  const snapPoints = useMemo(() => ['90%'], [])

  const resetState = useCallback(() => {
    setReason(REPORT_REASONS[0].key)
    setDetails('')
    setIncludeMessages(true)
    setSubmitting(false)
    setError(null)
    openedRef.current = false
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!reportSheetContext || submitting) return

    try {
      setSubmitting(true)
      setError(null)
      await submitUserReport({
        targetUserId: reportSheetContext.target.id,
        conversationId: reportSheetContext.conversationId,
        messageId: reportSheetContext.messageId,
        reason,
        details,
        includeRecentMessages: includeMessages,
      })
      showToast('Report sent. Thanks for helping keep Refs safe.')
      closeReportSheet()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'We could not submit your report right now.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }, [closeReportSheet, details, includeMessages, reason, reportSheetContext, showToast, submitUserReport, submitting])

  const handleClose = useCallback(() => {
    closeReportSheet()
  }, [closeReportSheet])

  const handleToggle = useCallback(() => {
    if (!reportSheetContext?.conversationId) {
      Alert.alert('No conversation context', 'We could not find recent messages for this chat.')
      return
    }
    setIncludeMessages((value) => !value)
  }, [reportSheetContext?.conversationId])

  const targetName = useMemo(() => {
    if (!reportSheetContext?.target) return 'this user'
    const { firstName, lastName, name, userName } = reportSheetContext.target
    const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim()
    return combined || name || userName || 'this user'
  }, [reportSheetContext])

  return (
    <BottomSheet
      ref={reportSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      handleComponent={() => null}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50 }}
      style={{ zIndex: 20000 }}
      containerStyle={{ zIndex: 20000 }}
      onChange={(index) => {
        if (index >= 0) {
          openedRef.current = true
          return
        }
        if (openedRef.current) {
          resetState()
          useAppStore.setState({ reportSheetContext: null })
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
        {reportSheetContext && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.$1 }}>
            <Avatar
              size={s.$4}
              source={reportSheetContext.target.image || (reportSheetContext.target as any)?.avatar_url}
              fallback={
                reportSheetContext.target.firstName ||
                reportSheetContext.target.name ||
                reportSheetContext.target.userName ||
                'User'
              }
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.muted2, fontSize: 18, fontWeight: '700' }}>
                Report {targetName}
              </Text>
              <Text style={{ color: c.muted, fontSize: 13, lineHeight: 18 }}>
                We review every report. The other person won’t know you sent it.
              </Text>
            </View>
          </View>
        )}

        <View style={{ gap: s.$05 }}>
          <Text style={{ color: c.muted2, fontSize: 13, fontWeight: '600' }}>Reason</Text>
          <View style={{ gap: s.$05 }}>
            {REPORT_REASONS.map((item) => {
              const selected = reason === item.key
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setReason(item.key)}
                  style={{
                    borderRadius: s.$1,
                    borderWidth: 1,
                    borderColor: selected ? c.accent : c.grey1,
                    paddingVertical: s.$08,
                    paddingHorizontal: s.$1,
                    backgroundColor: selected ? 'rgba(58,52,38,0.08)' : 'transparent',
                  }}
                >
                  <Text style={{ color: c.muted2, fontSize: 14 }}>{item.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={{ gap: s.$05 }}>
          <Text style={{ color: c.muted2, fontSize: 13, fontWeight: '600' }}>Details (optional)</Text>
          <BottomSheetTextInput
            value={details}
            onChangeText={setDetails}
            placeholder="Tell us what happened…"
            placeholderTextColor="rgba(0,0,0,0.35)"
            multiline
            maxLength={1000}
            editable={!submitting}
            style={{
              borderRadius: s.$1,
              borderWidth: 1,
              borderColor: c.grey1,
              minHeight: 120,
              paddingHorizontal: s.$1,
              paddingVertical: 12,
              fontSize: 14,
              color: c.muted2,
              textAlignVertical: 'top',
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.surface2,
            borderRadius: s.$12,
            paddingHorizontal: s.$1,
            paddingVertical: s.$08,
          }}
        >
          <View style={{ flex: 1, paddingRight: s.$05 }}>
            <Text style={{ color: c.muted2, fontSize: 14, fontWeight: '600' }}>
              Include recent messages
            </Text>
            <Text style={{ color: c.muted, fontSize: 12 }}>
              We’ll attach the last few messages from this chat for context.
            </Text>
          </View>
          <Switch
            value={includeMessages}
            onValueChange={handleToggle}
            disabled={!reportSheetContext?.conversationId}
            trackColor={{ true: c.accent, false: '#D3D3D3' }}
            thumbColor={includeMessages ? c.surface : '#FFFFFF'}
          />
        </View>

        {error && (
          <Text style={{ color: '#C04444', fontSize: 13, lineHeight: 18 }}>{error}</Text>
        )}

        <View style={{ gap: s.$05 }}>
          <Button
            title={submitting ? 'Submitting…' : 'Submit report'}
            variant="raised"
            onPress={handleSubmit}
            disabled={submitting || !reportSheetContext}
            style={{
              backgroundColor: c.accent,
              borderRadius: s.$12,
              opacity: submitting ? 0.7 : 1,
            }}
          />
          <Button
            title="Cancel"
            variant="raisedSecondary"
            onPress={handleClose}
            disabled={submitting}
            style={{ borderRadius: s.$12 }}
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  )
}
