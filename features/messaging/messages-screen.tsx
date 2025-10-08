import { useAppStore } from '@/features/stores'
import { Message } from '@/features/types'
import { c, s } from '@/features/style'
import { Sheet, XStack } from '@/ui'
import { Avatar, AvatarStack } from '@/ui/atoms/Avatar'
import { AvatarPicker } from '@/ui/inputs/AvatarPicker'
import MessageBubble from '@/ui/messaging/MessageBubble'
import MessageInput from '@/ui/messaging/MessageInput'
import { Link, router } from 'expo-router'
import { useEffect, useMemo, useRef, useState, lazy, Suspense, useCallback } from 'react'
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
const EmojiPicker = lazy(() => import('rn-emoji-keyboard'))
import { randomColors } from './utils'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated'

export function MessagesScreen({
  conversationId,
  onClose,
  registerCloseHandler,
}: {
  conversationId: string
  onClose?: () => void
  registerCloseHandler?: (fn: (() => void) | null) => void
}) {
  const {
    user,
    conversations,
    memberships,
    messagesPerConversation,
    sendMessage,
    sendReaction,
    oldestLoadedMessageDate,
    setOldestLoadedMessageDate,
    addOlderMessages,
    firstMessageDate,
    updateLastRead,
    getNewMessages,
    loadConversationMessages,
    conversationHydration,
    setProfileNavIntent,
    hydrateConversation,
  } = useAppStore()

  const flatListRef = useRef<FlatList<Message>>(null)
  const [message, setMessage] = useState('')
  const [highlightedMessageId, setHighlightedMessageId] = useState('')
  const [replying, setReplying] = useState(false)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
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

  const headerGap = 5
  const headerPaddingBottom = s.$08 as number
  const headerPaddingHorizontal = s.$1 as number
  // Use a fixed header height to prevent jumping on mount
  const headerHeight = insets.top + headerGap + headerPaddingBottom + (s.$4 as number)

  const conversation = conversations[conversationId]
  const membershipRecords = memberships[conversationId] || []

  useEffect(() => {
    if (!user) return
    if (!conversation) {
      hydrateConversation(conversationId).catch((error) => {
        console.error('hydrateConversation failed', error)
        router.replace('/messages')
      })
      return
    }
    if (!membershipRecords.length) return
    const isMember = membershipRecords.some((m) => m.expand?.user.id === user.id)
    if (!isMember) {
      router.replace('/messages')
    }
  }, [conversation, membershipRecords.length, user?.id, conversationId, hydrateConversation])

  const members = useMemo(() => {
    if (!user) return membershipRecords
    return membershipRecords.filter((m) => m.expand?.user.id !== user.id)
  }, [membershipRecords, user?.id])

  const conversationMessages = messagesPerConversation[conversationId] || []
  const highlightedMessage = conversationMessages.find((m) => m.id === highlightedMessageId)
  const hydrationState = conversationHydration[conversationId]

  useEffect(() => {
    if (hydrationState !== 'hydrated') {
      loadConversationMessages(conversationId).catch((error) => {
        console.error('Failed to hydrate conversation', error)
      })
    }
  }, [conversationId, hydrationState, loadConversationMessages])

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
    updateLastRead(conversationId, user.id)
  }, [conversationId, conversationMessages.length, updateLastRead, user?.id])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const handleShow = (e: any) => {
      setKeyboardVisible(true)
      setKeyboardHeight(e?.endCoordinates?.height ?? 0)
    }

    const handleHide = () => {
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

  const isDirectConversation = conversation?.is_direct ?? false

  if (!conversation || !user) return null

  const bottomOffset = keyboardVisible ? keyboardHeight + 3 : insets.bottom + 15

  const onMessageSubmit = () => {
    if (!message.trim()) return
    sendMessage(
      user.id,
      conversationId,
      message,
      replying ? highlightedMessageId : undefined,
      imageUrl || undefined
    )
    setMessage('')
    setHighlightedMessageId('')
    setReplying(false)
    setAttachmentOpen(false)
    setImageUrl('')
    flatListRef.current?.scrollToIndex({ index: 0, animated: true })
  }

  const onAttachmentPress = () => setAttachmentOpen(true)

  const onReplyPress = (messageId: string) => {
    setHighlightedMessageId(messageId)
    setReplying(true)
  }

  const onExpandReactionsPress = (messageId: string) => {
    setHighlightedMessageId(messageId)
    setShowEmojiPicker(true)
  }

  const loadMoreMessages = async () => {
    const oldestLoaded = oldestLoadedMessageDate[conversationId]
    const firstLoaded = firstMessageDate[conversationId]

    if (!oldestLoaded || !firstLoaded) {
      await loadConversationMessages(conversationId, { force: true }).catch((error) => {
        console.error('Failed to load messages', error)
      })
      return
    }

    if (oldestLoaded === firstLoaded) return

    const newMessages = await getNewMessages(conversationId, oldestLoaded)
    const oldestMessage = newMessages[newMessages.length - 1]
    if (oldestMessage?.created) {
      setOldestLoadedMessageDate(conversationId, oldestMessage.created)
    }
    addOlderMessages(conversationId, newMessages)
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const parentMessageIndex = conversationMessages.findIndex((m) => m.id === item.replying_to)
    const parentMessage = item.replying_to ? conversationMessages[parentMessageIndex] : undefined
    const parentMessageSender = parentMessage
      ? membershipRecords.find((member) => member.expand?.user.id === parentMessage.sender)?.expand?.user
      : undefined

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
      />
    )
  }

  const firstMemberUser = members[0]?.expand?.user

  const handleCloseComplete = useCallback(() => {
    if (onClose) {
      onClose()
      return
    }
    router.replace('/messages')
  }, [onClose])

  const startExitTransition = useCallback(() => {
    if (isExitingRef.current) return
    isExitingRef.current = true
    screenOpacity.value = withTiming(
      0,
      { duration: 160, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (finished) {
          runOnJS(handleCloseComplete)()
        }
      }
    )
  }, [handleCloseComplete, screenOpacity])

  useEffect(() => {
    registerCloseHandler?.(startExitTransition)
    return () => registerCloseHandler?.(null)
  }, [registerCloseHandler, startExitTransition])

  const handleBackPress = () => {
    startExitTransition()
  }

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: c.surface }, animatedContainerStyle]}>
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: -25, left: 0, right: 0, zIndex: 2 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: headerGap,
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
                  conversation.title
                : conversation.title}
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
              <Avatar source={firstMemberUser?.image} size={s.$4} />
            </Pressable>
          ) : (
            <Link href={`/messages/${conversationId}/member-list`}>
              <AvatarStack sources={members.map((m) => m.expand?.user.image)} size={s.$3} />
            </Link>
          )}
        </View>
      </SafeAreaView>

      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        inverted
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: s.$075,
          paddingTop: bottomOffset + 60,
          paddingBottom: s.$075,
          justifyContent: 'flex-end',
        }}
        ListFooterComponent={<View style={{ height: headerHeight }} />}
      />

      {attachmentOpen && (
        <Sheet
          onChange={(i: number) => {
            if (i === -1) setAttachmentOpen(false)
            setImageUrl('')
          }}
          style={{ padding: s.$2 }}
        >
          <AvatarPicker source={''} onComplete={(uri) => setImageUrl(uri)} onReplace={() => {}}>
            {null}
          </AvatarPicker>
        </Sheet>
      )}

      <View style={{ position: 'absolute', bottom: bottomOffset - 20, left: 0, right: 0, paddingHorizontal: s.$075 }}>
        <MessageInput
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
          disabled={attachmentOpen && !imageUrl}
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
