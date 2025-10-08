import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Dimensions } from 'react-native'
import { BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { c, s } from '@/features/style'
import { useAppStore } from '@/features/stores'
import type { ExpandedItem } from '@/features/types'
import { TapGestureHandler } from 'react-native-gesture-handler'

export type CommunityKind = 'interest' | 'event'

export function CommunityFormSheet() {
  const { 
    createRef, 
    createItem,
    communityFormSheetRef,
    communityFormOnAdded,
    closeCommunityFormSheet,
    registerBackdropPress, 
    unregisterBackdropPress 
  } = useAppStore()

  const [isOpen, setIsOpen] = useState(false)
  // Simplify: interest-only for now
  const [kind, setKind] = useState<CommunityKind>('interest')
  const [interestText, setInterestText] = useState('')
  // const [eventText, setEventText] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const backdropKeyRef = useRef<string | null>(null)
  const inputRef = useRef<any>(null)

  // Standardized snap like other sheets (fixed percent, no dynamic resize)
  const snapPoints = useMemo(() => ['75%'], [])

  const headerText = 'Type anything'
  const subtitleText = 'Whatever you want to connect with people over.'

  // Initialize visible text on open
  useEffect(() => {
    if (!isOpen) return
    setText(interestText)
    // Ensure Add button is enabled on fresh open
    setSubmitting(false)
    // Register global backdrop press to close this sheet (enables nav bar tap-to-dismiss)
    try {
      backdropKeyRef.current = registerBackdropPress(() => communityFormSheetRef.current?.close())
    } catch {}
    return () => {
      if (backdropKeyRef.current) {
        try { unregisterBackdropPress(backdropKeyRef.current) } catch {}
        backdropKeyRef.current = null
      }
    }
  }, [isOpen])

  // Toggle disabled for now (interest-only)
  const switchKind = (_k: CommunityKind) => {}

  const handleSubmit = async () => {
    const t = (text || '').replace(/\s+/g, ' ').trim()
    if (!t || submitting) return
    try {
      setSubmitting(true)
      const meta = JSON.stringify({ community: 'edge-patagonia', kind })
      const newRef = await createRef({ title: t, url: '', image: '', meta })
      // Do NOT create a user item – community interests are global and shouldn't appear on the user's grid
      const syntheticItem: any = {
        id: `temp-${newRef.id}`,
        ref: newRef.id,
        image: '',
        url: '',
        text: '',
        list: false,
        backlog: false,
        created: (newRef as any).created,
        updated: (newRef as any).updated,
        expand: { ref: newRef },
      }
      communityFormOnAdded?.(syntheticItem)
      setInterestText('')
      setText('')
      setKind('interest')
      closeCommunityFormSheet()
      setIsOpen(false)
    } catch (e) {
      setSubmitting(false)
    }
  }

  // const Toggle = () => null

  return (
    <BottomSheet
      ref={communityFormSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50 }}
      onAnimate={(fromIndex, toIndex) => {
        // Focus keyboard immediately when sheet starts opening
        if (fromIndex === -1 && toIndex !== -1) {
          // Focus on every open, not just the first time
          // Small delay to ensure sheet animation has started
          setTimeout(() => {
            try {
              inputRef.current?.focus()
            } catch (e) {
              console.warn('Failed to focus input:', e)
            }
          }, 50)
        }
        // Dismiss keyboard immediately when sheet starts closing
        if (fromIndex !== -1 && toIndex === -1) {
          try { inputRef.current?.blur() } catch {}
          try { require('react-native').Keyboard.dismiss() } catch {}
        }
      }}
      onChange={(i) => {
        const open = i !== -1
        setIsOpen(open)
        if (!open) {
          // Unregister backdrop handler on close
          if (backdropKeyRef.current) {
            try { unregisterBackdropPress(backdropKeyRef.current) } catch {}
            backdropKeyRef.current = null
          }
        }
      }}
      handleComponent={null}
      backdropComponent={(p) => (
        <BottomSheetBackdrop {...p} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior={'close'} />
      )}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enableContentPanningGesture={true}
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        contentContainerStyle={{ paddingHorizontal: s.$2, paddingTop: 24, paddingBottom: 90, position: 'relative' }}
      >
        {/* Toggle removed for now */}
        <View style={{ height: 8 }} />

        {/* Title and subtitle */}
        <View style={{ paddingHorizontal: s.$1, marginBottom: s.$1, marginLeft: -15 }}>
          <BottomSheetTextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={headerText}
            placeholderTextColor={c.prompt}
            style={{ color: c.muted2, fontSize: 32, fontWeight: '700', paddingVertical: 10 }}
            autoFocus={false}
            blurOnSubmit={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <Text style={{ color: c.muted, opacity: 0.7, fontSize: s.$09, marginTop: 6 }}>{subtitleText}</Text>
        </View>
      </BottomSheetScrollView>

      {/* Add button (absolute for stable position) - sibling to scroll view to avoid clipping */}
      <View style={{ position: 'absolute', left: s.$1, right: s.$1, top: 235, zIndex: 30 }} pointerEvents="auto">
        <TapGestureHandler onActivated={() => (!submitting && text.trim() ? handleSubmit() : null)}>
          <View
            style={{
              backgroundColor: c.accent,
              borderRadius: 48,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: !text.trim() || submitting ? 0.6 : 1,
            }}
            onTouchEnd={() => (!submitting && text.trim() ? handleSubmit() : null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '600' }}>Add</Text>
          </View>
        </TapGestureHandler>
      </View>
    </BottomSheet>
  )
}
