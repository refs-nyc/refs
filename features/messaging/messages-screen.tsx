import { useAppStore } from '@/features/stores'
import { Message } from '@/features/types'
import { c, s } from '@/features/style'
import { Sheet, XStack } from '@/ui'
import { Avatar, AvatarStack } from '@/ui/atoms/Avatar'
import { AvatarPicker } from '@/ui/inputs/AvatarPicker'
import MessageBubble from '@/ui/messaging/MessageBubble'
import MessageInput from '@/ui/messaging/MessageInput'
import { Link, router } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Keyboard, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import EmojiPicker from 'rn-emoji-keyboard'
import { randomColors } from './utils'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function MessagesScreen({ conversationId }: { conversationId: string }) {
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
  } = useAppStore()
  const flatListRef = useRef<FlatList>(null)
  const [message, setMessage] = useState<string>('')
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>('')
  const [replying, setReplying] = useState<boolean>(false)
  const [attachmentOpen, setAttachmentOpen] = useState<boolean>(false)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false)
  const windowHeight = useWindowDimensions().height
  const insets = useSafeAreaInsets()
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  const conversation = conversations[conversationId]
  const members = memberships[conversationId].filter((m) => m.expand?.user.id !== user?.id)

  const conversationMessages = messagesPerConversation[conversationId]
  const highlightedMessage = conversationMessages.find((m) => m.id === highlightedMessageId)

  const colorMap = useMemo(() => {
    const colors = randomColors(members.length)

    const map = members.reduce((acc, member, index) => {
      if (member.expand?.user.id) acc[member.expand?.user.id] = colors[index]
      return acc
    }, {} as Record<string, any>)

    return map
  }, [members.length])

  useEffect(() => {
    if (!user) return
    updateLastRead(conversationId, user.id)
  }, [])

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

  const bottomOffset = keyboardVisible ? keyboardHeight + 3 : insets.bottom + 15

  if (!user) return null

  const onMessageSubmit = () => {
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

  const onAttachmentPress = () => {
    setAttachmentOpen(true)
  }

  const onReplyPress = (messageId: string) => {
    setHighlightedMessageId(messageId)
    setReplying(true)
  }

  const onExpandReactionsPress = (messageId: string) => {
    setHighlightedMessageId(messageId)
    setShowEmojiPicker(true)
  }

  const loadMoreMessages = async () => {
    if (!user) return
    if (oldestLoadedMessageDate[conversationId] === firstMessageDate[conversationId]) return

    const newMessages = await getNewMessages(
      conversationId,
      oldestLoadedMessageDate[conversationId]
    )
    const oldestMessage = newMessages[newMessages.length - 1]
    setOldestLoadedMessageDate(conversationId, oldestMessage.created!)
    addOlderMessages(conversationId, newMessages)
  }

  function renderMessage({ item }: { item: Message }) {
    const parentMessageIndex = conversationMessages.findIndex((m) => m.id === item.replying_to)
    const parentMessage = item.replying_to ? conversationMessages[parentMessageIndex] : undefined
    const parentMessageSender = parentMessage
      ? memberships[conversationId].find(
          (member) => member.expand?.user.id === parentMessage.sender
        )?.expand?.user
      : undefined
    return (
      <MessageBubble
        key={item.id}
        message={item}
        sender={
          memberships[conversationId].find((member) => member.expand?.user.id === item.sender)
            ?.expand?.user || user!
        }
        showSender={!conversation.is_direct}
        senderColor={colorMap[item.sender]}
        onReplyPress={onReplyPress}
        onExpandReactionsPress={onExpandReactionsPress}
        parentMessage={parentMessage}
        parentMessageSender={parentMessageSender}
        onParentMessagePress={() => {
          flatListRef.current?.scrollToIndex({
            index: parentMessageIndex,
            animated: true,
            viewPosition: 1,
          })
        }}
      />
    )
  }

  return (
    <View
      style={{
        justifyContent: 'flex-start',
        height: windowHeight - 120,
        backgroundColor: c.surface,
      }}
    >
      <View
        style={{
          paddingHorizontal: s.$1 + 6,
          paddingTop: Math.max(8, insets.top - 40),
          paddingBottom: s.$075,
          marginTop: -30,
        }}
      >
        <XStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.back()}
            style={{ paddingRight: s.$075, paddingVertical: s.$05 }}
          >
            <Ionicons name="chevron-back" size={18} color={c.muted} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: s.$075 }}>
            <Text
              style={{
                color: c.prompt,
                fontSize: (s.$09 as number) + 4,
                fontFamily: 'System',
                fontWeight: '700',
                lineHeight: s.$1half,
              }}
              numberOfLines={2}
            >
              {conversation.is_direct
                ? `${members[0].expand?.user.firstName ?? ''} ${members[0].expand?.user.lastName ?? ''}`.trim()
                : conversation.title}
            </Text>
          </View>
          {conversation.is_direct ? (
            <Pressable onPress={() => router.push(`/user/${members[0].expand?.user.userName}`)}>
              <Avatar source={members[0].expand?.user.image} size={s.$4} />
            </Pressable>
          ) : (
            <Link href={`/messages/${conversationId}/member-list`}>
              <AvatarStack sources={members.map((m) => m.expand?.user.image)} size={s.$3} />
            </Link>
          )}
        </XStack>
      </View>
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={conversationMessages}
          renderItem={(item) => renderMessage(item)}
          inverted
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: s.$075,
            paddingTop: s.$075,
            paddingBottom: bottomOffset + 80,
            justifyContent: 'flex-end',
          }}
        />
        {attachmentOpen && (
          <Sheet
            onChange={(i: number) => {
              i === -1 && setAttachmentOpen(false)
              setImageUrl('')
            }}
            style={{ padding: s.$2 }}
          >
            <AvatarPicker source={''} onComplete={(s) => setImageUrl(s)} onReplace={() => {}}>
              {null}
            </AvatarPicker>
          </Sheet>
        )}
        <View style={{ paddingHorizontal: s.$075, marginBottom: bottomOffset }}>
          <MessageInput
            onMessageSubmit={onMessageSubmit}
            setMessage={setMessage}
            message={message}
            parentMessage={replying ? highlightedMessage : undefined}
            parentMessageSender={
              replying
                ? members.find((m) => m.expand?.user.id === highlightedMessage?.sender)?.expand
                    ?.user || user
                : undefined
            }
            onReplyClose={() => {
              setReplying(false), setHighlightedMessageId('')
            }}
            allowAttachment={true}
            onAttachmentPress={onAttachmentPress}
            disabled={attachmentOpen && !imageUrl}
            compact
          />
        </View>
        {showEmojiPicker && highlightedMessage && (
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
        )}
      </View>
    </View>
  )
}
