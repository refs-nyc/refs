import { useEffect, useMemo, useRef, useState, lazy, Suspense, useCallback } from 'react'
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  InteractionManager,
  Keyboard,
  Platform,
  Pressable,
  Text,
  View,
  Linking,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery, type InfiniteData } from '@tanstack/react-query'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'

import { useAppStore } from '@/features/stores'
import { Message } from '@/features/types'
import { c, s } from '@/features/style'
import { Avatar } from '@/ui/atoms/Avatar'
import MessageBubble from '@/ui/messaging/MessageBubble'
import MessageInput, { MessageInputHandle } from '@/ui/messaging/MessageInput'
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
  const blockUser = useAppStore((state) => state.blockUser)
  const unblockUser = useAppStore((state) => state.unblockUser)
  const isUserBlocked = useAppStore((state) => state.isUserBlocked)
  const activateInteractionGate = useAppStore((state) => state.activateInteractionGate)
  const deactivateInteractionGate = useAppStore((state) => state.deactivateInteractionGate)
  const navigation = useNavigation<any>()

  const realtimeLockRef = useRef(false)
  const realtimeReleaseRef = useRef<NodeJS.Timeout | null>(null)
  const realtimeUnsubscribeRef = useRef<(() => void) | null>(null)
  const sendMutexRef = useRef(false)
  const preparedExitRef = useRef(false)
  const closeInteractionRef = useRef<number | null>(null)
  const conversationBlockedRef = useRef(false)

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
      let nextRecord = record

      if (
        action === 'create' &&
        !record.image &&
        (typeof record.text !== 'string' || record.text.trim().length === 0)
      ) {
        try {
          const hydrated = await pocketbase.collection('messages').getOne<Message>(record.id)
          if (hydrated) {
            nextRecord = hydrated
          }
        } catch (error) {
          console.warn('[messages] failed to hydrate realtime message', {
            id: record.id,
            error,
          })
        }
      }

      if (conversationBlockedRef.current && action === 'create') {
        return
      }

      queryClient.setQueryData<InfiniteData<ConversationMessagesPage>>(
        messagingKeys.messages(conversationId),
        (existing) => {
          if (!existing) return existing

          const pages = existing.pages.map((page) => {
            if (!page.messages.length) return page
            if (action === 'delete') {
              return {
                ...page,
                messages: page.messages.filter((message) => message.id !== nextRecord.id),
              }
            }

            if (action === 'update') {
              return {
                ...page,
                messages: page.messages.map((message) =>
                  message.id === nextRecord.id ? { ...message, ...nextRecord } : message
                ),
              }
            }

            // create
            if (page === existing.pages[0]) {
              if (page.messages.some((message) => message.id === nextRecord.id)) {
                return page
              }
              return {
                ...page,
                messages: [nextRecord, ...page.messages],
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
              latestMessage: nextRecord,
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
              fields: 'id,conversation,sender,text,image,replying_to,created',
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

  const otherMemberUser = members[0]?.expand?.user
  const otherMemberId = otherMemberUser?.id
  const otherMemberAvatar =
    otherMemberUser?.image || (otherMemberUser as any)?.avatar_url || ''
  const otherMemberDisplayName =
    `${otherMemberUser?.firstName ?? ''} ${otherMemberUser?.lastName ?? ''}`.trim() ||
    otherMemberUser?.name ||
    otherMemberUser?.userName ||
    ''
  const otherMemberHandle = otherMemberUser?.userName
    ? `@${otherMemberUser.userName}`
    : null

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

  const focusMessageInput = useCallback(() => {
    const performFocus = () => {
      if (__DEV__) {
        console.log('[messages] focusMessageInput', Date.now())
      }
      messageInputRef.current?.focus()
    }

    requestAnimationFrame(performFocus)
    InteractionManager.runAfterInteractions(performFocus)
  }, [])

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('transitionEnd', focusMessageInput)
    return () => {
      unsubscribe?.()
    }
  }, [navigation, focusMessageInput, conversationId])

  useFocusEffect(
    useCallback(() => {
      focusMessageInput()
    }, [focusMessageInput, conversationId])
  )

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
  const isBlocked = Boolean(isDirectConversation && otherMemberId && isUserBlocked(otherMemberId))
  const isSendDisabled = !canSendMessage || isUploadingAttachment || isBlocked

  useEffect(() => {
    conversationBlockedRef.current = isBlocked
    if (isBlocked) {
      setReplying(false)
      setHighlightedMessageId('')
      setAttachments((prev) => (prev.length ? [] : prev))
      setMessage('')
    }
  }, [isBlocked])

  const onMessageSubmit = async () => {
    if (!message.trim() && readyAttachments.length === 0) return
    if (isBlocked) return
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

  const handleDirectActions = useCallback(() => {
    if (!isDirectConversation || !otherMemberId) return

    const displayName = otherMemberDisplayName || 'this user'
    const blockLabel = isBlocked ? 'Unblock user' : `Block ${displayName}`

    const sendReport = () => {
      const targetHandle = otherMemberHandle || displayName
      const subject = encodeURIComponent('Report user')
      const body = encodeURIComponent(
        `I would like to report ${targetHandle}.\n\nPlease include any details below:`
      )
      const mailtoUrl = `mailto:support@refs.nyc?subject=${subject}&body=${body}`
      Linking.openURL(mailtoUrl).catch(() => {
        showToast('Unable to open mail client')
      })
    }

    const toggleBlock = async () => {
      try {
        if (isBlocked) {
          await unblockUser(otherMemberId)
          showToast('User unblocked')
        } else {
          await blockUser(otherMemberId)
          showToast('User blocked')
        }
      } catch (error) {
        console.warn('Failed to toggle block', error)
        showToast('Something went wrong')
      }
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [blockLabel, 'Report user', 'Cancel'],
          cancelButtonIndex: 2,
          destructiveButtonIndex: isBlocked ? undefined : 0,
          title: otherMemberDisplayName || undefined,
        },
        (selection) => {
          if (selection === 0) {
            void toggleBlock()
          } else if (selection === 1) {
            sendReport()
          }
        }
      )
    } else {
      Alert.alert(
        displayName,
        undefined,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: blockLabel,
            style: isBlocked ? 'default' : 'destructive',
            onPress: () => {
              void toggleBlock()
            },
          },
          {
            text: 'Report user',
            onPress: sendReport,
          },
        ],
        { cancelable: true }
      )
    }
  }, [
    blockUser,
    isBlocked,
    isDirectConversation,
    otherMemberDisplayName,
    otherMemberId,
    otherMemberHandle,
    showToast,
    unblockUser,
  ])

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
                ? otherMemberDisplayName || conversation?.title || 'Conversation'
                : conversation?.title || 'Conversation'}
            </Text>
          </View>
          {isDirectConversation ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => {
                  const profileUserName = otherMemberUser?.userName
                  if (!profileUserName) return
                  setProfileNavIntent({ targetPagerIndex: 0, source: 'messages' })
                  router.replace(`/user/${profileUserName}`)
                }}
              >
                <Avatar
                  source={otherMemberAvatar}
                  fallback={otherMemberDisplayName || otherMemberUser?.name || otherMemberUser?.userName}
                  size={s.$4}
                />
              </Pressable>
              <Pressable
                onPress={handleDirectActions}
                hitSlop={10}
                style={{ paddingHorizontal: 2, paddingVertical: 4 }}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={c.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push(`/messages/${conversationId}/member-list`)}
              hitSlop={8}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 0,
                elevation: 2,
                backgroundColor: c.surface,
                borderRadius: 50,
                borderWidth: 3,
                borderColor: c.grey1,
                paddingHorizontal: 12,
                paddingVertical: 7,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel="Chat details"
            >
              <Text
                style={{
                  color: c.muted,
                  fontSize: 13,
                  fontWeight: '500',
                  fontFamily: 'Inter',
                  textTransform: 'lowercase',
                }}
              >
                details
              </Text>
            </Pressable>
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
        keyboardDismissMode="none"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: s.$075,
          paddingTop: bottomOffset + 70,
          paddingBottom: s.$075,
          justifyContent: 'flex-end',
        }}
        ListFooterComponent={<View style={{ height: headerHeight }} />}
      />

      <View
        style={{
          position: 'absolute',
          bottom: bottomOffset,
          left: 0,
          right: 0,
          paddingHorizontal: s.$075,
          paddingBottom: s.$05,
        }}
      >
        {isBlocked && otherMemberId && (
          <View
            style={{
              backgroundColor: c.surface2,
              borderRadius: s.$12,
              paddingVertical: 12,
              paddingHorizontal: s.$1,
              marginBottom: s.$075,
            }}
          >
            <Text
              style={{
                color: c.muted,
                fontSize: 12,
                fontFamily: 'Inter',
                textAlign: 'center',
              }}
            >
              {`You blocked ${otherMemberDisplayName || 'this user'}. Unblock to resume chatting.`}
            </Text>
            <Pressable
              onPress={() => {
                void (async () => {
                  try {
                    await unblockUser(otherMemberId)
                    showToast('User unblocked')
                  } catch (error) {
                    console.warn('Failed to unblock user', error)
                    showToast('Something went wrong')
                  }
                })()
              }}
              style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 }}
              hitSlop={6}
            >
              <Text
                style={{
                  color: c.accent,
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                }}
              >
                Unblock
              </Text>
            </Pressable>
          </View>
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
      </View>

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
