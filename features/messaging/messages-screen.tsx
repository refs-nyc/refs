import { useAppStore } from '@/features/stores'
import { DecryptedMessage } from '@/features/types'
import { c, s } from '@/features/style'
import { Heading, Sheet, XStack } from '@/ui'
import { Avatar, AvatarStack } from '@/ui/atoms/Avatar'
import { AvatarPicker } from '@/ui/inputs/AvatarPicker'
import MessageBubble from '@/ui/messaging/MessageBubble'
import MessageInput from '@/ui/messaging/MessageInput'
import { useLiveQuery } from '@canvas-js/hooks/components'
import { Link } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, useWindowDimensions, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import EmojiPicker from 'rn-emoji-keyboard'
import { randomColors } from './utils'

export function MessagesScreen({ conversationId }: { conversationId: string }) {
  const {
    user,
    sendMessage,
    sendReaction,
    // oldestLoadedMessageDate,
    // setOldestLoadedMessageDate,
    // addOlderMessages,
    canvasApp,
    conversationsById,
    getMembers,
    decryptMessages,
    updateLastRead,
  } = useAppStore()
  const flatListRef = useRef<FlatList>(null)
  const [message, setMessage] = useState<string>('')
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>('')
  const [replying, setReplying] = useState<boolean>(false)
  const [attachmentOpen, setAttachmentOpen] = useState<boolean>(false)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false)
  const windowHeight = useWindowDimensions().height

  const conversation = conversationsById[conversationId]

  const members = getMembers(conversationId)

  const conversationMessages = useLiveQuery(canvasApp, 'message', {
    where: { conversation: conversationId },
  })

  const decryptedConversationMessages = useMemo(() => {
    return conversationMessages ? decryptMessages(conversationId, conversationMessages) : []
  }, [conversationMessages])

  const otherMembers = members.filter((m) => m.expand?.user.did !== user?.did)
  const highlightedMessage = decryptedConversationMessages.find(
    (m) => m.id === highlightedMessageId
  )

  const colorMap = useMemo(() => {
    const colors = randomColors(otherMembers.length)

    const map = otherMembers.reduce((acc, member, index) => {
      if (member.expand?.user.did) acc[member.expand?.user.did] = colors[index]
      return acc
    }, {} as Record<string, any>)

    return map
  }, [otherMembers.length])

  useEffect(() => {
    try {
      updateLastRead(conversationId)
    } catch (e) {
      // do nothing
    }
  }, [])

  if (!user) return null
  if (conversation === null) return null

  const onMessageSubmit = () => {
    sendMessage({
      conversationId,
      text: message,
      parentMessageId: replying ? highlightedMessageId : undefined,
      imageUrl: imageUrl || undefined,
    })
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
    // TODO: implement this using a state hook in this component
    // if (oldestLoadedMessageDate[conversationId] === firstMessageDate[conversationId]) return

    // const newMessages = await getNewMessages(
    //   conversationId,
    //   oldestLoadedMessageDate[conversationId]
    // )
    // const oldestMessage = newMessages[newMessages.length - 1]
    // setOldestLoadedMessageDate(conversationId, oldestMessage.created!)
    // addOlderMessages(conversationId, newMessages)
  }

  function renderMessage({ item }: { item: DecryptedMessage }) {
    const parentMessageIndex = decryptedConversationMessages.findIndex(
      (m) => m.id === item.expand.decryptedData.parentMessageId
    )
    const parentMessage = item.expand.decryptedData.parentMessageId
      ? decryptedConversationMessages[parentMessageIndex]
      : undefined
    const parentMessageSender = parentMessage
      ? members.find((member) => member.expand?.user.did === parentMessage.sender)?.expand?.user
      : undefined
    return (
      <MessageBubble
        key={item.id}
        message={item}
        sender={
          members.find((member) => member.expand?.user.did === item.sender)?.expand?.user || user!
        }
        showSender={!conversation!.is_direct}
        senderColor={colorMap[item.sender as string]}
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
        // window height minus the height of the navigation element
        height: windowHeight - 120,
        backgroundColor: c.surface,
        paddingHorizontal: s.$075,
      }}
    >
      <XStack
        gap={s.$1}
        style={{
          alignItems: 'center',
          paddingBottom: 0,
          paddingLeft: s.$1,
          zIndex: 1,
          paddingTop: s.$1,
        }}
      >
        <Heading
          tag="h2semi"
          style={{ width: conversation.is_direct ? undefined : '60%' }}
          numberOfLines={2}
        >
          {conversation.is_direct
            ? otherMembers[0].expand?.user.firstName + ' ' + otherMembers[0].expand?.user.lastName
            : conversation.title}
        </Heading>
        {conversation.is_direct ? (
          <Link href={`/user/${members[0].expand?.user.did}`}>
            <Avatar source={members[0].expand?.user.image} size={s.$4} />
          </Link>
        ) : (
          <XStack style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Link href={`/messages/${conversationId}/member-list`}>
              <AvatarStack sources={members.map((m) => m.expand?.user.image || '')} size={s.$3} />
            </Link>
          </XStack>
        )}
      </XStack>
      <KeyboardAvoidingView
        keyboardVerticalOffset={100}
        style={{
          paddingHorizontal: s.$075,
          flex: 1,
          display: 'flex',
          paddingBottom: s.$1,
        }}
        behavior={'height'}
      >
        <FlatList
          ref={flatListRef}
          data={conversationMessages}
          renderItem={(item) => renderMessage(item)}
          inverted
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.1}
          contentContainerStyle={{
            minHeight: '90%',
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
        <MessageInput
          onMessageSubmit={onMessageSubmit}
          setMessage={setMessage}
          message={message}
          parentMessage={replying ? highlightedMessage : undefined}
          parentMessageSender={
            replying
              ? members.find((m) => m.expand?.user.did === highlightedMessage?.sender)?.expand
                  ?.user || user
              : undefined
          }
          onReplyClose={() => {
            setReplying(false), setHighlightedMessageId('')
          }}
          allowAttachment={true}
          onAttachmentPress={onAttachmentPress}
          disabled={attachmentOpen && !imageUrl}
        />
        {showEmojiPicker && highlightedMessage && (
          <EmojiPicker
            open={true}
            onClose={() => {
              setHighlightedMessageId('')
              setShowEmojiPicker(false)
              setReplying(false)
            }}
            onEmojiSelected={(e: any) => {
              sendReaction(highlightedMessageId, e.emoji)
              setHighlightedMessageId('')
              setShowEmojiPicker(false)
            }}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  )
}
