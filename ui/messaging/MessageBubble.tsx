import { formatTimestamp } from '@/features/messaging/utils'
import { useAppStore } from '@/features/stores'
import { DecryptedMessage, Message, Profile, Reaction } from '@/features/types'
import { c, s } from '@/features/style'
import { useCalendars } from 'expo-localization'
import { View, Text } from 'react-native'
import { Pressable } from 'react-native'
import { Avatar } from '../atoms/Avatar'
import { XStack } from '../core/Stacks'
import { Link } from 'expo-router'
import ContextMenu from 'react-native-context-menu-view'
import PressableImage from '../atoms/PressableImage'
import { useEffect, useState } from 'react'

export default function MessageBubble({
  message,
  showSender,
  sender,
  senderColor,
  parentMessage,
  parentMessageSender,
  onParentMessagePress,
  onReplyPress,
  onExpandReactionsPress,
}: {
  message: DecryptedMessage
  showSender: boolean
  sender: Profile
  senderColor?: string
  parentMessage?: DecryptedMessage
  parentMessageSender?: Profile
  onParentMessagePress?: () => void
  onReplyPress: (messageId: string) => void
  onExpandReactionsPress: (messageId: string) => void
}) {
  const calendars = useCalendars()
  const { user, deleteReaction, getReactionsForMessage } = useAppStore()

  const [messageReactions, setMessageReactions] = useState<Reaction[]>()

  useEffect(() => {
    async function updateReactions() {
      const reactions = await getReactionsForMessage(message.id)
      setMessageReactions(reactions)
    }
    updateReactions()
  }, [])

  const timeZone = calendars[0].timeZone || 'America/New_York'

  const isMe = message.sender === user?.did
  const date = message.created ? message.created.slice(0, message.created.length - 1) : ''
  const formattedDate = formatTimestamp(date, timeZone)

  return (
    <XStack style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
      {sender && showSender && !isMe && (
        <View style={{ alignSelf: 'flex-end' }}>
          <Link href={`/user/${sender.did}`}>
            <Avatar source={sender.image} size={s.$3} />
          </Link>
        </View>
      )}
      <ContextMenu
        actions={[
          { title: 'Reply', systemIcon: 'arrowshape.turn.up.left' },
          { title: 'React', systemIcon: 'chevron.forward' },
        ]}
        onPress={(e) => {
          if (e.nativeEvent.name === 'Reply') {
            onReplyPress(message.id)
          }
          if (e.nativeEvent.name === 'React') {
            onExpandReactionsPress(message.id)
          }
        }}
      >
        <View
          style={{
            backgroundColor: isMe ? c.accent2 : c.surface2,
            padding: s.$08,
            marginVertical: s.$05,
            borderRadius: s.$075,
            width: '100%',
          }}
        >
          {sender && showSender && !isMe && (
            <Text style={{ color: senderColor, fontWeight: 'bold' }}>{sender.firstName}</Text>
          )}
          {parentMessage && (
            <Pressable onPress={onParentMessagePress}>
              <View
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: '#ccc',
                  paddingLeft: 10,
                  marginVertical: 10,
                }}
              >
                <Text style={{ color: c.black }}>
                  <Text style={{ fontWeight: 'bold' }}>{parentMessageSender?.firstName}</Text> said:
                </Text>
                <Text style={{ fontStyle: 'italic', color: c.muted }}>
                  {parentMessage ? parentMessage.expand.decryptedData.text : ''}
                </Text>
              </View>
            </Pressable>
          )}
          {message.expand.decryptedData.imageUrl && (
            <PressableImage source={message.expand.decryptedData.imageUrl} size={s.$15} />
          )}
          <Text>{message.expand.decryptedData.text}</Text>
          {messageReactions && (
            <XStack>
              {messageReactions.map((r) => {
                const isMine = r.user === user?.did
                return (
                  <Pressable key={r.id} onPress={isMine ? () => deleteReaction(r.id) : null}>
                    <XStack
                      style={{
                        backgroundColor: isMine ? c.accent : c.muted,
                        padding: s.$05,
                        borderRadius: s.$1,
                      }}
                    >
                      <Text>{r.emoji}</Text>
                      <Avatar source={r.expand?.user.image} size={s.$1} />
                    </XStack>
                  </Pressable>
                )
              })}
            </XStack>
          )}
          <Text style={{ color: c.muted, fontSize: s.$08, alignSelf: 'flex-end' }}>
            {formattedDate}
          </Text>
        </View>
      </ContextMenu>
    </XStack>
  )
}
