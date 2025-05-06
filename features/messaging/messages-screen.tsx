import { Heading, Sheet, XStack, YStack } from '@/ui'
import { View, DimensionValue, KeyboardAvoidingView, Keyboard, Modal, FlatList } from 'react-native'
import { c, s } from '../style'
import { useEffect, useMemo, useRef, useState } from 'react'
import { pocketbase, useUserStore } from '../pocketbase'
import { PAGE_SIZE, useMessageStore } from '../pocketbase/stores/messages'
import { Pressable, Text } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Avatar, AvatarStack } from '@/ui/atoms/Avatar'
import { Ionicons } from '@expo/vector-icons'
import MessageBubble from '@/ui/messaging/MessageBubble'
import { EmojiKeyboard } from 'rn-emoji-keyboard'
import MessageInput from '@/ui/messaging/MessageInput'
import { randomColors } from './utils'
import { Message } from '../pocketbase/stores/types'
import { AvatarPicker } from '@/ui/inputs/AvatarPicker'

export function MessagesScreen({ conversationId }: { conversationId: string }) {
  const { user } = useUserStore()
  const {
    conversations,
    memberships,
    messagesPerConversation,
    sendMessage,
    sendReaction,
    oldestLoadedMessageDate,
    setOldestLoadedMessageDate,
    addOlderMessages,
    firstMessageDate,
  } = useMessageStore()
  const flatListRef = useRef<FlatList>(null)
  const [message, setMessage] = useState<string>('')
  const [highlightedMessageId, setHighlightedMessageId] = useState<string>('')
  const [showInModal, setShowInModal] = useState<'' | 'contextMenu' | 'reactions'>('')
  const [replying, setReplying] = useState<boolean>(false)
  const [attachmentOpen, setAttachmentOpen] = useState<boolean>(false)
  const [imageUrl, setImageUrl] = useState<string>('')

  const conversation = conversations[conversationId]
  const members = memberships[conversationId].filter((m) => m.expand?.user.id !== user?.id)
  const ownMembership = memberships[conversationId].filter((m) => m.expand?.user.id === user?.id)[0]
  const router = useRouter()

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
    async function setLastRead() {
      const lastReadDate = conversationMessages[0].created
      await pocketbase
        .collection('memberships')
        .update(ownMembership.id, { last_read: lastReadDate })
    }
    setLastRead()
  }, [])

  const onMessageLongPress = (id: string) => {
    setHighlightedMessageId(id)
    setShowInModal('contextMenu')
  }

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

  const loadMoreMessages = async () => {
    if (!user) return
    if (oldestLoadedMessageDate[conversationId] === firstMessageDate[conversationId]) return

    const newMessages = await pocketbase.collection('messages').getList<Message>(0, PAGE_SIZE, {
      filter: `conversation = "${conversationId}" && created < "${oldestLoadedMessageDate[conversationId]}"`,
      sort: '-created',
    })
    const oldestMessage = newMessages.items[newMessages.items.length - 1]
    setOldestLoadedMessageDate(conversationId, oldestMessage.created!)
    addOlderMessages(conversationId, newMessages.items)
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
        onLongPress={onMessageLongPress}
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
        flex: 1,
        justifyContent: 'flex-start',
        height: s.full as DimensionValue,
        backgroundColor: c.surface,
        paddingHorizontal: s.$075,
      }}
    >
      <XStack
        gap={s.$1}
        style={{
          alignItems: 'center',
          paddingBottom: 0,
          zIndex: 1,
          backgroundColor: c.surface,
          paddingTop: s.$7,
        }}
      >
        <Pressable
          onPress={() => {
            router.dismissTo('/messages')
          }}
        >
          <Ionicons name="chevron-back" size={s.$2} color={c.grey2} />
        </Pressable>
        <Heading
          tag="h2semi"
          style={{ width: conversation.is_direct ? undefined : '60%' }}
          numberOfLines={2}
        >
          {conversation.is_direct
            ? members[0].expand?.user.firstName + ' ' + members[0].expand?.user.lastName
            : conversation.title}
        </Heading>
        {conversation.is_direct ? (
          <Link href={`/user/${members[0].expand?.user.userName}`}>
            <Avatar source={members[0].expand?.user.image} size={s.$4} />
          </Link>
        ) : (
          <XStack style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Link href={`/messages/${conversationId}/member-list`}>
              <AvatarStack sources={members.map((m) => m.expand?.user.image)} size={s.$3} />
            </Link>
          </XStack>
        )}
      </XStack>
      <KeyboardAvoidingView
        style={{
          height: '85%',
          paddingHorizontal: s.$075,
        }}
        behavior={'position'}
      >
        <View
          style={{
            width: '95%',
            height: replying ? '80%' : '88%',
            margin: 'auto',
            backgroundColor: c.surface,
          }}
        >
            <FlatList
              ref={flatListRef}
              data={conversationMessages}
              renderItem={(item) => renderMessage(item)}
              inverted
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.1}
              contentContainerStyle={{ minHeight: '100%', justifyContent: 'flex-end' }}
            />
          {attachmentOpen && (
            <Sheet
              onChange={(i: number) => {
                i === -1 && setAttachmentOpen(false)
                setImageUrl('')
              }}
              style={{ padding: s.$2 }}
            >
              <AvatarPicker
                source={''}
                onComplete={(s) => setImageUrl(s)}
                onReplace={() => console.log('replace')}
              >
                {null}
              </AvatarPicker>
            </Sheet>
          )}
        </View>
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
        />
        {showInModal && highlightedMessage && (
          <Modal animationType="fade" transparent={true} visible={true}>
            <Pressable
              style={{ height: s.full as DimensionValue, backgroundColor: '#0009' }}
              onPress={() => {
                setHighlightedMessageId('')
                setShowInModal('')
                setReplying(false)
              }}
            >
              <View style={{ height: '20%', backgroundColor: '#0000' }}></View>
              <View style={{ maxHeight: '80%' }}>
                <View style={{ maxHeight: '20%' }}>
                  <MessageBubble
                    message={highlightedMessage}
                    showSender={false}
                    sender={
                      members.find((member) => member.expand?.user.id === highlightedMessage.sender)
                        ?.expand?.user || user
                    }
                  />
                </View>
                <View style={{ minHeight: '80%' }}>
                  {showInModal === 'reactions' && (
                    <EmojiKeyboard
                      onEmojiSelected={(e) => {
                        sendReaction(user.id, highlightedMessageId, e.emoji)
                        setHighlightedMessageId('')
                        setShowInModal('')
                      }}
                    />
                  )}
                  {showInModal === 'contextMenu' && (
                    <YStack
                      style={{
                        alignSelf:
                          highlightedMessage.sender === user.id ? 'flex-end' : 'flex-start',
                        backgroundColor: c.surface,
                        padding: s.$08,
                        borderRadius: s.$1,
                        width: s.$10,
                      }}
                    >
                      <Pressable
                        style={{ padding: s.$05, width: 'auto' }}
                        onPress={() => {
                          setShowInModal(''), setReplying(true)
                        }}
                      >
                        <Text>Reply</Text>
                      </Pressable>
                      <Pressable
                        style={{ padding: s.$05, width: 'auto' }}
                        onPress={() => {
                          setShowInModal('reactions')
                          setReplying(false)
                        }}
                      >
                        <Text>React</Text>
                      </Pressable>
                    </YStack>
                  )}
                </View>
              </View>
            </Pressable>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </View>
  )
}
