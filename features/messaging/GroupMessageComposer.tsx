import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  BackHandler,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'

import { useAppStore } from '@/features/stores'
import { Avatar } from '@/ui/atoms/Avatar'
import { c, s } from '@/features/style'

const RETRY_DELAY_MS = 2000

export function GroupMessageComposer() {
  const {
    user,
    groupComposerTargets,
    groupComposerOnSuccess,
    closeGroupComposer,
    moduleBackdropAnimatedIndex,
    createConversation,
    sendMessage,
    setMessagesForConversation,
  } = useAppStore()

  const sheetRef = useRef<BottomSheet>(null)
  const titleInputRef = useRef<TextInput>(null)
  const messageInputRef = useRef<TextInput>(null)
  const pagerRef = useRef<ScrollView>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPayloadRef = useRef<{ title: string; message: string } | null>(null)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [, setActivePage] = useState(0)

  const { width } = useWindowDimensions()
  const horizontalPadding = (s.$1 as number) + 6
  const pageWidth = Math.max(width - horizontalPadding * 2, 0)
  const safePageWidth = pageWidth || width || 1

  const snapPoints = useMemo(() => ['62%'], [])
  const titleAnimation = useRef(new Animated.Value(0)).current

  const clearRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (groupComposerTargets.length) {
      setTitle('')
      setMessage('')
      setSending(false)
      pagerRef.current?.scrollTo({ x: 0, animated: false })
      setActivePage(0)
      pendingPayloadRef.current = null
      clearRetry()

      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(0)
        setTimeout(() => {
          titleInputRef.current?.focus()
        }, 150)
      })
    } else {
      clearRetry()
      sheetRef.current?.close()
    }

    return () => {
      clearRetry()
    }
  }, [groupComposerTargets.length, clearRetry])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (groupComposerTargets.length) {
        closeGroupComposer()
        return true
      }
      return false
    })

    return () => subscription.remove()
  }, [groupComposerTargets.length, closeGroupComposer])

  const triggerTitleValidationAnimation = useCallback(() => {
    titleAnimation.setValue(0)
    Animated.sequence([
      Animated.timing(titleAnimation, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(titleAnimation, {
        toValue: -1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(titleAnimation, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start()
  }, [titleAnimation])

  const handleSendSuccess = useCallback(
    (conversationId: string, payload: { title: string; message: string }) => {
      const successCallback = groupComposerOnSuccess
      const snapshot = payload

      closeGroupComposer()
      pendingPayloadRef.current = null
      clearRetry()
      setTimeout(() => {
        Keyboard.dismiss()
      }, 0)
      setTitle('')
      setMessage('')
      setSending(false)
      router.replace(`/messages/${conversationId}`)
      if (successCallback) successCallback({ conversationId, title: snapshot.title })
    },
    [closeGroupComposer, groupComposerOnSuccess, clearRetry]
  )

  const attemptSend = useCallback(async () => {
    if (!user) return
    if (!groupComposerTargets.length) return
    const payload = pendingPayloadRef.current
    if (!payload) return

    try {
      const memberIds = groupComposerTargets.map((member) => member.id)
      const conversationId = await createConversation(false, user.id, memberIds, payload.title)
      setMessagesForConversation(conversationId, [])
      handleSendSuccess(conversationId, payload)

      try {
        await sendMessage(user.id, conversationId, payload.message)
      } catch (error) {
        console.error('Failed to send initial group message', error)
      }
    } catch (error) {
      clearRetry()
      retryTimeoutRef.current = setTimeout(() => {
        attemptSend()
      }, RETRY_DELAY_MS)
    }
  }, [
    user,
    groupComposerTargets,
    createConversation,
    sendMessage,
    handleSendSuccess,
    clearRetry,
    setMessagesForConversation,
  ])

  const handleSend = useCallback(() => {
    const trimmedTitle = title.trim()
    const trimmedMessage = message.trim()

    if (!trimmedTitle) {
      triggerTitleValidationAnimation()
      titleInputRef.current?.focus()
      return
    }
    if (!trimmedMessage || sending) return

    pendingPayloadRef.current = { title: trimmedTitle, message: trimmedMessage }
    setSending(true)
    attemptSend()
  }, [title, message, sending, triggerTitleValidationAnimation, attemptSend])

  const titleAnimatedStyle = {
    transform: [
      {
        scale: titleAnimation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [1.03, 1, 1.03],
        }),
      },
      {
        rotate: titleAnimation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: ['-3deg', '0deg', '3deg'],
        }),
      },
    ],
  }

  const limitedTargets = groupComposerTargets.slice(0, 3)

  const handleGoToMembers = () => {
    if (!groupComposerTargets.length) return
    pagerRef.current?.scrollTo({ x: safePageWidth, animated: true })
    setActivePage(1)
  }

  const handleBackToCompose = () => {
    pagerRef.current?.scrollTo({ x: 0, animated: true })
    setActivePage(0)
  }

  const keyboardDismissAndClose = () => {
    Keyboard.dismiss()
    closeGroupComposer()
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
          keyboardDismissAndClose()
        }
      }}
      handleComponent={() => null}
      backgroundStyle={{ backgroundColor: c.surface, borderRadius: 50 }}
      keyboardBehavior="extend"
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: (s.$1 as number) + 6, paddingTop: s.$1 }}>
        {groupComposerTargets.length > 0 && (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / safePageWidth)
              setActivePage(newIndex)
              if (newIndex === 0) {
                titleInputRef.current?.focus()
              }
            }}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ width: safePageWidth, paddingBottom: s.$1 }}>
              <View style={{ gap: s.$1 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Animated.View style={[{ flex: 1, marginRight: s.$1 }, titleAnimatedStyle]}>
                    <TextInput
                      ref={titleInputRef}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Group Title"
                      placeholderTextColor="rgba(176,176,176,0.5)"
                      style={{
                        fontSize: s.$1,
                        fontWeight: '700',
                        color: c.muted2,
                        paddingVertical: 0,
                      }}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => messageInputRef.current?.focus()}
                    />
                  </Animated.View>
                  <Pressable onPress={handleGoToMembers} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row' }}>
                      {limitedTargets.map((profile, index) => (
                        <View key={profile.id} style={{ marginLeft: index === 0 ? 0 : -10 }}>
                          <Avatar source={profile.image} size={s.$4} />
                        </View>
                      ))}
                    </View>
                    {groupComposerTargets.length > 3 && (
                      <Text style={{ color: c.grey1, fontSize: s.$09, marginLeft: s.$05 }}>
                        {`+${groupComposerTargets.length - 3}`}
                      </Text>
                    )}
                  </Pressable>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: c.white,
                    borderRadius: s.$2,
                    paddingVertical: s.$09,
                    paddingHorizontal: s.$1,
                    marginVertical: s.$075,
                  }}
                >
                  <TextInput
                    ref={messageInputRef}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Say anything..."
                    placeholderTextColor="rgba(176,176,176,0.5)"
                    style={{ flex: 1, fontSize: s.$09, color: c.muted2, paddingVertical: 0 }}
                    multiline
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
              </View>
            </View>
            <View style={{ width: safePageWidth, paddingBottom: s.$1 }}>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: s.$1,
                  paddingVertical: s.$05,
                }}
              >
                <Pressable
                  onPress={handleBackToCompose}
                  style={{
                    position: 'absolute',
                    left: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s.$05,
                    paddingVertical: s.$05,
                    paddingHorizontal: s.$05,
                  }}
                >
                  <Ionicons name="chevron-back" size={s.$1} color={c.grey1} />
                  <Text style={{ color: c.grey1, fontSize: s.$09 }}>Back</Text>
                </Pressable>
                <Text style={{ fontSize: s.$1, fontWeight: '700', color: c.muted2 }}>Adding</Text>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {groupComposerTargets.map((profile) => (
                  <View
                    key={profile.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: s.$1,
                      paddingVertical: s.$075,
                    }}
                  >
                    <Avatar source={profile.image} size={s.$4} />
                    <View>
                      <Text style={{ fontSize: s.$1, fontWeight: '600', color: c.muted2 }}>
                        {profile.firstName || profile.name || profile.userName}
                      </Text>
                      {(profile.location || profile.userName) && (
                        <Text style={{ color: c.grey1, fontSize: s.$09 }}>
                          {profile.location || `@${profile.userName}`}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </BottomSheetView>
    </BottomSheet>
  )
}
