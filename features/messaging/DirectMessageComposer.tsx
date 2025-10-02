import { useEffect, useMemo, useRef, useState } from 'react'
import { BackHandler, Keyboard, Pressable, Text, TextInput, View, ScrollView } from 'react-native'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { useAppStore } from '@/features/stores'
import { Avatar } from '@/ui/atoms/Avatar'
import { c, s } from '@/features/style'
import Ionicons from '@expo/vector-icons/Ionicons'

export function DirectMessageComposer() {
  const {
    user,
    dmComposerTarget,
    dmComposerInitialConversationId,
    dmComposerOnSuccess,
    closeDMComposer,
    moduleBackdropAnimatedIndex,
    createConversation,
    sendMessage,
    getDirectConversations,
    setMessagesForConversation,
  } = useAppStore()

  const sheetRef = useRef<BottomSheet>(null)
  const inputRef = useRef<TextInput>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const snapPoints = useMemo(() => ['62%'], [])

  useEffect(() => {
    if (dmComposerTarget) {
      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(0)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 150)
      })
    } else {
      sheetRef.current?.close()
      setMessage('')
      setSending(false)
    }
  }, [dmComposerTarget])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dmComposerTarget) {
        closeDMComposer()
        return true
      }
      return false
    })

    return () => subscription.remove()
  }, [dmComposerTarget, closeDMComposer])

  const handleSend = async () => {
    if (!user || !dmComposerTarget) return
    const trimmed = message.trim()
    if (!trimmed || sending) return

    setSending(true)
    try {
      let conversationId = dmComposerInitialConversationId ?? ''

      if (!conversationId) {
        const directConversations = await getDirectConversations()
        for (const conversation of directConversations) {
          const otherUserId = conversation.expand?.memberships_via_conversation
            .map((m) => m.expand?.user.id)
            .filter((id) => id !== user.id)[0]
          if (otherUserId === dmComposerTarget.id) {
            conversationId = conversation.id
            break
          }
        }
      }

      if (!conversationId) {
        conversationId = await createConversation(true, user.id, [dmComposerTarget.id])
        setMessagesForConversation(conversationId, [])
      }

      await sendMessage(user.id, conversationId, trimmed)
      const successCallback = dmComposerOnSuccess
      const targetSnapshot = dmComposerTarget
      closeDMComposer()
      setMessage('')
      Keyboard.dismiss()
      if (successCallback && targetSnapshot) successCallback(targetSnapshot)
    } catch (error) {
      console.warn('Failed to send direct message', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      animatedIndex={moduleBackdropAnimatedIndex}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      )}
      onChange={(index) => {
        if (index === -1) {
          closeDMComposer()
        }
      }}
      handleComponent={() => null}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50 }}
      keyboardBehavior="extend"
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: s.$1 + 6, paddingTop: s.$1 }}>
        {dmComposerTarget && (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: s.$1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: s.$1, fontWeight: '700', color: c.muted2 }}>
                Message to {dmComposerTarget.firstName || dmComposerTarget.name || ''}
              </Text>
              <Avatar source={dmComposerTarget.image} size={s.$4} />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: c.white,
                borderRadius: s.$2,
                marginVertical: s.$075,
                paddingVertical: s.$09,
                paddingHorizontal: s.$1,
              }}
            >
              <TextInput
                ref={inputRef}
                value={message}
                onChangeText={setMessage}
                placeholder="Say anything..."
                placeholderTextColor="rgba(176,176,176,0.5)"
                style={{ flex: 1, fontSize: s.$09, color: c.muted2, paddingVertical: 0 }}
                multiline
                autoFocus
                returnKeyType="send"
                enablesReturnKeyAutomatically
                onSubmitEditing={handleSend}
              />
              <Pressable
                onPress={handleSend}
                disabled={sending || !message.trim()}
                style={{ paddingHorizontal: s.$075, paddingVertical: s.$05, marginRight: -3 }}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={s.$2}
                  color={sending || !message.trim() ? 'rgba(176,176,176,0.4)' : c.grey2}
                />
              </Pressable>
            </View>
          </ScrollView>
        )}
      </BottomSheetView>
    </BottomSheet>
  )
}
