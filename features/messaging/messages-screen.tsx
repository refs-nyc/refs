import { useEffect, useMemo, useRef, useState, lazy, Suspense, useCallback } from 'react'
import { FlatList, Keyboard, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery, type InfiniteData } from '@tanstack/react-query'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link, router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'

import { useAppStore } from '@/features/stores'
import { Message } from '@/features/types'
import { c, s } from '@/features/style'
import { Avatar, AvatarStack } from '@/ui/atoms/Avatar'
import MessageBubble from '@/ui/messaging/MessageBubble'
import MessageInput, { MessageInputHandle } from '@/ui/messaging/MessageInput'
import { InviteBanner } from '@/ui/messaging/InviteBanner'
import { pinataUpload } from '@/features/pinata'
import { randomColors } from './utils'
import { useConversationMessages } from '@/features/messaging/useConversationMessages'
import { messagingKeys, fetchConversation, type ConversationMessagesPage } from '@/features/queries/messaging'
import { patchConversationPreview } from '@/features/queries/messaging-cache'
import { queryClient } from '@/core/queryClient'
import { pocketbase } from '@/features/pocketbase'
import { endInteraction, startInteraction } from '@/features/perf/interactions'
import { ensureMediaLibraryAccess } from '@/features/media/permissions'
const EmojiPicker = lazy(() => import('rn-emoji-keyboard'))

export function MessagesScreen({
  conversationId,
  onClose,
  registerCloseHandler,
}: {
  conversationId: string
  onClose?: () => void
  registerCloseHandler?: (fn: (() => void) | null) => void
}) {
  const user = useAppStore((state) => state.user)
  const sendMessage = useAppStore((state) => state.sendMessage)
  const sendReaction = useAppStore((state) => state.sendReaction)
  const updateLastRead = useAppStore((state) => state.updateLastRead)
  const setProfileNavIntent = useAppStore((state) => state.setProfileNavIntent)
  const showToast = useAppStore((state) => state.showToast)
  const activateInteractionGate = useAppStore((state) => state.activateInteractionGate)
  const deactivateInteractionGate = useAppStore((state) => state.deactivateInteractionGate)

  const realtimeLockRef = useRef(false)
  const realtimeReleaseRef = useRef<NodeJS.Timeout | null>(null)
  const realtimeUnsubscribeRef = useRef<(() => void) | null>(null)
  const sendMutexRef = useRef(false)
  const preparedExitRef = useRef(false)
  const closeInteractionRef = useRef<number | null>(null)

  const {
    messages: queryMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(conversationId, {
    enabled: Boolean(user?.id),
  })

  useEffect(() => {
    const startedAt = startInteraction('messages:open', { conversationId })
    return () => {
      endInteraction('messages:open', startedAt, { conversationId })
    }
  }, [conversationId])

  const applyRealtimeMessage = useCallback(
    async (record: Message, action: 'create' | 'update' | 'delete') => {
      queryClient.setQueryData<InfiniteData<ConversationMessagesPage>>(
        messagingKeys.messages(conversationId),
        (existing) => {
          if (!existing) return existing

          const pages = existing.pages.map((page) => {
            if (!page.messages.length) return page
            if (action === 'delete') {
              return {
                ...page,
                messages: page.messages.filter((message) => message.id !== record.id),
              }
            }

            if (action === 'update') {
              return {
                ...page,
                messages: page.messages.map((message) => (message.id === record.id ? { ...message, ...record } : message)),
              }
            }

            // create
            if (page === existing.pages[0]) {
              if (page.messages.some((message) => message.id === record.id)) {
                return page
              }
              return {
                ...page,
                messages: [record, ...page.messages],
              }
            }

            return page
          })

          return { ...existing, pages }
        }
      )

      if (user?.id) {
        if (action === 'delete') {
          // fallback to invalidate conversation preview when latest message removed
          queryClient.invalidateQueries({ queryKey: messagingKeys.conversations(user.id) })
        } else {
          patchConversationPreview(user.id, conversationId, (entry) => {
            if (!entry) return entry
            return {
              ...entry,
              latestMessage: record,
            }
          })
        }
      }
    },
    [conversationId, user?.id]
  )

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      let unsubscribe: (() => void) | null = null

      const subscribe = async () => {
        try {
          const startedAt = Date.now()
          console.log('[boot-trace] messages.thread.subscribe:start', conversationId)
          const sub = await pocketbase.collection('messages').subscribe<Message>(
            '*',
            async (event) => {
              if (event.record?.conversation !== conversationId) return
              if (event.action !== 'create' && event.action !== 'update' && event.action !== 'delete') return

              if (realtimeLockRef.current) {
                return
              }
              realtimeLockRef.current = true

              try {
                await applyRealtimeMessage(event.record, event.action)
              } finally {
                if (realtimeReleaseRef.current) {
                  clearTimeout(realtimeReleaseRef.current)
                }
                realtimeReleaseRef.current = setTimeout(() => {
                  realtimeLockRef.current = false
                }, 1200)
              }
            },
            {
              fields: 'id,conversation,sender,created',
            }
          )
          console.log('[boot-trace] messages.thread.subscribe:established', conversationId, Date.now() - startedAt, 'ms')

          realtimeUnsubscribeRef.current = sub
          if (cancelled) {
            sub?.()
          } else {
            unsubscribe = sub
          }
        } catch (error) {
          console.warn('[messages] realtime subscription failed', error)
        }
      }

      void subscribe()

      return () => {
        cancelled = true
        if (unsubscribe) {
          try {
            unsubscribe()
          } catch {}
        }
        realtimeUnsubscribeRef.current = null
        if (realtimeReleaseRef.current) {
          clearTimeout(realtimeReleaseRef.current)
          realtimeReleaseRef.current = null
        }
        realtimeLockRef.current = false
      }
    }, [applyRealtimeMessage, conversationId])
  )

  const conversationQuery = useQuery({
    queryKey: messagingKeys.conversation(conversationId),
    queryFn: () => fetchConversation(conversationId),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    enabled: Boolean(conversationId),
  })

  const flatListRef = useRef<FlatList<Message>>(null)
  const messageInputRef = useRef<MessageInputHandle>(null)
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [message, setMessage] = useState('')
  const [highlightedMessageId, setHighlightedMessageId] = useState('')
  const [replying, setReplying] = useState(false)
  type AttachmentDraft = {
    id: string
    localUri: string
    status: 'uploading' | 'ready'
    remoteUrl?: string
  }

  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [localImageMap, setLocalImageMap] = useState<Record<string, string>>({})
  const attachmentTimersRef = useRef<Record<string, NodeJS.Timeout>>({})

  useEffect(() => {
    return () => {
      Object.values(attachmentTimersRef.current).forEach((timer) => clearTimeout(timer))
      attachmentTimersRef.current = {}
    }
  }, [])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const insets = useSafeAreaInsets()

  const screenOpacity = useSharedValue(0)
  const isExitingRef = useRef(false)

  const animatedContainerStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }))

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) })
  }, [screenOpacity])

  useEffect(() => {
    setAttachments([])
    Object.values(attachmentTimersRef.current).forEach((timer) => clearTimeout(timer))
    attachmentTimersRef.current = {}
  }, [conversationId])

  const headerGap = 5
  const headerPaddingBottom = s.$08 as number
  const headerPaddingHorizontal = s.$1 as number
  // Use a fixed header height to prevent jumping on mount
  const headerHeight = insets.top + headerGap + headerPaddingBottom + (s.$4 as number)

  const conversation = conversationQuery.data?.conversation
  const membershipRecords = conversationQuery.data?.memberships ?? []

  useEffect(() => {
    if (!user) return
    if (!conversationQuery.data && !conversationQuery.isLoading) {
      router.replace('/messages')
      return
    }
    if (!membershipRecords.length) return
    const isMember = membershipRecords.some((m) => m.expand?.user.id === user.id)
    if (!isMember) {
      router.replace('/messages')
    }
  }, [conversationQuery.data, conversationQuery.isLoading, membershipRecords.length, user?.id, conversationId])

  const members = useMemo(() => {
    if (!user) return membershipRecords
    return membershipRecords.filter((m) => m.expand?.user.id !== user.id)
  }, [membershipRecords, user?.id])

  const conversationMessages = queryMessages
  const highlightedMessage = conversationMessages.find((m) => m.id === highlightedMessageId)
  const colorMap = useMemo(() => {
    const colors = randomColors(members.length)
    return members.reduce((acc, member, index) => {
      if (member.expand?.user.id) acc[member.expand?.user.id] = colors[index]
      return acc
    }, {} as Record<string, string>)
  }, [members])

  useEffect(() => {
    if (!conversationMessages.length) return
    if (!user) return
    updateLastRead(conversationId, user.id, conversationMessages[0]?.created)
  }, [conversationId, conversationMessages, updateLastRead, user?.id])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const handleShow = (e: any) => {
      if (__DEV__) {
        console.log('[messages] keyboard show', {
          at: Date.now(),
          height: e?.endCoordinates?.height ?? 0,
        })
      }
      setKeyboardVisible(true)
      setKeyboardHeight(e?.endCoordinates?.height ?? 0)
    }

    const handleHide = () => {
      if (__DEV__) {
        console.log('[messages] keyboard hide', { at: Date.now() })
      }
      setKeyboardVisible(false)
      setKeyboardHeight(0)
    }

    const showSub = Keyboard.addListener(showEvent, handleShow)
    const hideSub = Keyboard.addListener(hideEvent, handleHide)

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    if (!conversationMessages.length) return
    requestAnimationFrame(() => {
      try {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
      } catch {}
    })
  }, [conversationId, conversationMessages.length])

  const isDirectConversation = Boolean(conversation?.is_direct)

  if (!user) return null

  const bottomOffset = keyboardVisible ? keyboardHeight + 3 : insets.bottom + 0
  const isUploadingAttachment = attachments.some((attachment) => attachment.status === 'uploading')
  const readyAttachments = attachments.filter(
    (attachment): attachment is AttachmentDraft & { remoteUrl: string } =>
      attachment.status === 'ready' && Boolean(attachment.remoteUrl)
  )
  const canSendMessage = message.trim().length > 0 || readyAttachments.length > 0
  const isSendDisabled = !canSendMessage || isUploadingAttachment

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current)
        focusTimerRef.current = null
      }
    }
  }, [])

  const focusMessageInput = useCallback(() => {
    if (__DEV__) {
      console.log('[messages] focusMessageInput immediate', Date.now())
    }
    messageInputRef.current?.preventNextBlur()
    messageInputRef.current?.focus()
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current)
    }
    focusTimerRef.current = setTimeout(() => {
      if (__DEV__) {
        console.log('[messages] focusMessageInput delayed', Date.now())
      }
      messageInputRef.current?.preventNextBlur()
      messageInputRef.current?.focus()
      focusTimerRef.current = null
    }, 140)
  }, [])

  const onMessageSubmit = async () => {
    if (!message.trim() && readyAttachments.length === 0) return
    if (sendMutexRef.current) return

    sendMutexRef.current = true

    try {
      if (message.trim()) {
        await sendMessage(
          user.id,
          conversationId,
          message,
          replying ? highlightedMessageId : undefined,
          undefined
        )
      }

      if (readyAttachments.length > 0) {
        for (const attachment of readyAttachments) {
          await sendMessage(user.id, conversationId, '', undefined, attachment.remoteUrl)
        }
      }

      setMessage('')
      setAttachments([])
      setHighlightedMessageId('')
      setReplying(false)
      flatListRef.current?.scrollToIndex({ index: 0, animated: true })
    } finally {
      setTimeout(() => {
        sendMutexRef.current = false
      }, 350)
    }
  }

  const onAttachmentPress = useCallback(async () => {
    try {
      const hasPermission = await ensureMediaLibraryAccess()
      if (!hasPermission) {
        showToast('Photo access is required to attach images')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      })

      if (result.canceled || !result.assets?.length) {
        return
      }

      const asset = result.assets[0]
      const attachmentId = `attachment-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`
      setAttachments((prev) => [
        ...prev,
        { id: attachmentId, localUri: asset.uri, status: 'uploading' },
      ])
      showToast('Attaching photo…')

      try {
        const uploadedUrl = await pinataUpload(asset, { prefix: 'messages' })
        let attachmentStillPresent = false
        setAttachments((prev) =>
          prev.map((attachment) => {
            if (attachment.id === attachmentId) {
              attachmentStillPresent = true
              return { ...attachment, status: 'ready', remoteUrl: uploadedUrl }
            }
            return attachment
          })
        )

        if (attachmentStillPresent) {
          setLocalImageMap((prev) => ({ ...prev, [uploadedUrl]: asset.uri }))
          if (attachmentTimersRef.current[uploadedUrl]) {
            clearTimeout(attachmentTimersRef.current[uploadedUrl])
          }
          attachmentTimersRef.current[uploadedUrl] = setTimeout(() => {
            setLocalImageMap((prev) => {
              if (!prev[uploadedUrl]) return prev
              const next = { ...prev }
              delete next[uploadedUrl]
              return next
            })
            delete attachmentTimersRef.current[uploadedUrl]
          }, 120000)
          showToast('Photo ready to send')
        }
      } catch (error) {
        console.error('Failed to attach photo', error)
        showToast('Could not attach photo')
        setAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId))
      }
    } catch (error) {
      console.error('Failed to attach photo', error)
      showToast('Could not attach photo')
    }
  }, [showToast])

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      const target = attachments.find((attachment) => attachment.id === attachmentId)
      setAttachments((prev) => prev.filter((attachment) => attachment.id !== attachmentId))
      if (target?.remoteUrl) {
        const remoteUrl = target.remoteUrl
        setLocalImageMap((prev) => {
          if (!prev[remoteUrl]) return prev
          const next = { ...prev }
          delete next[remoteUrl]
          return next
        })
        if (attachmentTimersRef.current[remoteUrl]) {
          clearTimeout(attachmentTimersRef.current[remoteUrl])
          delete attachmentTimersRef.current[remoteUrl]
        }
      }
      showToast('Attachment removed')
    },
    [attachments, showToast]
  )

  const onReplyPress = (messageId: string) => {
    setHighlightedMessageId(messageId)
    setReplying(true)
  }

  const onExpandReactionsPress = (messageId: string) => {
    setHighlightedMessageId(messageId)
    setShowEmojiPicker(true)
  }

  const loadMoreMessages = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const renderMessage = ({ item }: { item: Message }) => {
    const parentMessageIndex = conversationMessages.findIndex((m) => m.id === item.replying_to)
    const parentMessage = item.replying_to ? conversationMessages[parentMessageIndex] : undefined
    const parentMessageSender = parentMessage
      ? membershipRecords.find((member) => member.expand?.user.id === parentMessage.sender)?.expand?.user
      : undefined
    const localImageUri = item.image ? localImageMap[item.image] : undefined

    return (
      <MessageBubble
        key={item.id}
        message={item}
        sender={
          membershipRecords.find((member) => member.expand?.user.id === item.sender)?.expand?.user || user
        }
        showSender={!isDirectConversation}
        senderColor={colorMap[item.sender]}
        onReplyPress={onReplyPress}
        onExpandReactionsPress={onExpandReactionsPress}
        parentMessage={parentMessage}
        parentMessageSender={parentMessageSender}
        onParentMessagePress={() => {
          if (parentMessageIndex >= 0) {
            flatListRef.current?.scrollToIndex({ index: parentMessageIndex, animated: true })
          }
        }}
        localImageUri={localImageUri}
      />
    )
  }

  const firstMemberUser = members[0]?.expand?.user
  const firstMemberAvatar = firstMemberUser?.image || (firstMemberUser as any)?.avatar_url || ''

  const stackAvatarEntries = useMemo(
    () =>
      members.map((m) => {
        const userRecord = m.expand?.user as any
        return {
          source: userRecord?.image || userRecord?.avatar_url || '',
          fallback: userRecord?.firstName || userRecord?.name || userRecord?.userName || '',
        }
      }),
    [members]
  )
  const stackSources = stackAvatarEntries.map((entry) => entry.source)
  const stackFallbacks = stackAvatarEntries.map((entry) => entry.fallback)

  const handleCloseComplete = useCallback(() => {
    endInteraction('messages:close', closeInteractionRef.current ?? undefined, { conversationId })
    closeInteractionRef.current = null
    preparedExitRef.current = false
    deactivateInteractionGate()
    if (onClose) {
      onClose()
      return
    }
    router.replace('/messages')
  }, [deactivateInteractionGate, onClose, conversationId])

  const startExitTransition = useCallback(() => {
    if (isExitingRef.current) return
    isExitingRef.current = true
    if (!preparedExitRef.current) {
      preparedExitRef.current = true
      closeInteractionRef.current = startInteraction('messages:close', { conversationId })
      if (realtimeUnsubscribeRef.current) {
        try {
          realtimeUnsubscribeRef.current()
        } catch {}
        realtimeUnsubscribeRef.current = null
      }
      activateInteractionGate()
    }
    screenOpacity.value = withTiming(
      0,
      { duration: 160, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(handleCloseComplete)()
        }
      }
    )
  }, [activateInteractionGate, conversationId, handleCloseComplete, screenOpacity])

  useEffect(() => {
    registerCloseHandler?.(startExitTransition)
    return () => registerCloseHandler?.(null)
  }, [registerCloseHandler, startExitTransition])

  const handleBackPress = () => {
    startExitTransition()
  }

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: c.surface }, animatedContainerStyle]}>
      <View
        style={{ 
          position: 'absolute', 
          top: -10, 
          left: 0, 
          right: 0, 
          zIndex: 2,
          backgroundColor: c.surface,
          paddingTop: insets.top + headerGap,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: headerPaddingBottom,
            paddingHorizontal: headerPaddingHorizontal,
          }}
        >
          <Pressable onPress={handleBackPress} style={{ paddingRight: 8, paddingVertical: s.$05 }}>
            <Ionicons name="chevron-back" size={18} color={c.muted} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: s.$075 }}>
            <Text
              style={{
                color: c.newDark,
                fontSize: (s.$09 as number) + 4,
                fontFamily: 'System',
                fontWeight: '700',
                lineHeight: s.$1half,
              }}
              numberOfLines={2}
            >
              {isDirectConversation
                ? `${firstMemberUser?.firstName ?? ''} ${firstMemberUser?.lastName ?? ''}`.trim() ||
                  conversation?.title || 'Conversation'
                : conversation?.title || 'Conversation'}
            </Text>
          </View>
          {isDirectConversation ? (
            <Pressable
              onPress={() => {
                const profileUserName = firstMemberUser?.userName
                if (!profileUserName) return
                setProfileNavIntent({ targetPagerIndex: 0, source: 'messages' })
                router.push(`/user/${profileUserName}`)
              }}
            >
              <Avatar
                source={firstMemberAvatar}
                fallback={firstMemberUser?.firstName || firstMemberUser?.name || firstMemberUser?.userName}
                size={s.$4}
              />
            </Pressable>
          ) : (
            <Link href={`/messages/${conversationId}/member-list`}>
              <AvatarStack sources={stackSources} fallbacks={stackFallbacks} size={s.$3} />
            </Link>
          )}
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        inverted
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: s.$075,
          paddingTop: bottomOffset + 70,
          paddingBottom: s.$075,
          justifyContent: 'flex-end',
        }}
        ListFooterComponent={<View style={{ height: headerHeight }} />}
      />

      <ScrollView
        style={{ position: 'absolute', bottom: bottomOffset, left: 0, right: 0 }}
        contentContainerStyle={{ paddingHorizontal: s.$075, paddingBottom: s.$05 }}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        {!isDirectConversation && (
          <InviteBanner
            inviteToken={conversation?.inviteToken}
            chatTitle={conversation?.title || 'Group Chat'}
            onActionPressIn={() => {
              if (__DEV__) {
                console.log('[messages] invite action press-in', Date.now())
              }
              messageInputRef.current?.preventNextBlur()
              messageInputRef.current?.focus()
            }}
            onActionComplete={focusMessageInput}
          />
        )}
        <MessageInput
          ref={messageInputRef}
          onMessageSubmit={onMessageSubmit}
          setMessage={setMessage}
          message={message}
          parentMessage={replying ? highlightedMessage : undefined}
          parentMessageSender={
            replying
              ? members.find((m) => m.expand?.user.id === highlightedMessage?.sender)?.expand?.user || user
              : undefined
          }
          onReplyClose={() => {
            setReplying(false)
            setHighlightedMessageId('')
          }}
          allowAttachment
          onAttachmentPress={onAttachmentPress}
          disabled={isSendDisabled}
          attachments={attachments}
          onAttachmentClear={removeAttachment}
          compact
        />
      </ScrollView>

      {showEmojiPicker && highlightedMessage && (
        <Suspense fallback={null}>
          <EmojiPicker
            open={true}
            onClose={() => {
              setHighlightedMessageId('')
              setShowEmojiPicker(false)
              setReplying(false)
            }}
            onEmojiSelected={(e: any) => {
              sendReaction(user.id, highlightedMessageId, e.emoji)
              setHighlightedMessageId('')
              setShowEmojiPicker(false)
            }}
          />
        </Suspense>
      )}
    </Animated.View>
  )
}
