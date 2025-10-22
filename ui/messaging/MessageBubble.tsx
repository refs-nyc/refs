import { formatTimestamp } from '@/features/messaging/utils'
import { useAppStore } from '@/features/stores'
import { Message, Profile } from '@/features/types'
import { c, s } from '@/features/style'
import { useCalendars } from 'expo-localization'
import { View, Text } from 'react-native'
import { Pressable } from 'react-native'
import { Avatar } from '../atoms/Avatar'
import { XStack } from '../core/Stacks'
import { Link } from 'expo-router'
import ContextMenu from 'react-native-context-menu-view'
import PressableImage from '../atoms/PressableImage'

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
  localImageUri,
}: {
  message: Message
  showSender: boolean
  sender: Profile
  senderColor?: string
  parentMessage?: Message
  parentMessageSender?: Profile
  onParentMessagePress?: () => void
  onReplyPress: (messageId: string) => void
  onExpandReactionsPress: (messageId: string) => void
  localImageUri?: string
}) {
  const calendars = useCalendars()
  const user = useAppStore((state) => state.user)
  const messageReactions = useAppStore((state) => state.reactions[message.id])
  const deleteReaction = useAppStore((state) => state.deleteReaction)

  const senderAvatar = sender?.image || (sender as any)?.avatar_url || ''
  const senderFallback = sender?.firstName || sender?.name || sender?.userName || null

  const timeZone = calendars[0].timeZone || 'America/New_York'

  const isMe = message.sender === user?.id
  const date = message.created ? message.created.slice(0, message.created.length - 1) : ''
  const formattedDate = formatTimestamp(date, timeZone)

  return (
    <XStack style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
      {sender && showSender && !isMe && (
        <View style={{ alignSelf: 'flex-end' }}>
          <Link href={`/user/${sender.userName}`}>
            <Avatar source={senderAvatar} fallback={senderFallback} size={s.$3} />
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
            backgroundColor: 'rgba(176,176,176,0.1)',
            padding: s.$08,
            marginVertical: s.$05,
            borderRadius: 15,
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
                <Text style={{ fontStyle: 'italic', color: c.muted }}>{parentMessage?.text}</Text>
              </View>
            </Pressable>
          )}
          {message.image && (
            <PressableImage
              source={message.image}
              localUri={localImageUri}
              size={s.$15}
            />
          )}
          <Text>{message.text}</Text>
          {messageReactions && (
            <XStack>
              {messageReactions.map((r) => {
                const isMine = r.user === user?.id
                const reactionUser = r.expand?.user as any
                const reactionUserImage = reactionUser?.image || reactionUser?.avatar_url || ''
                const reactionFallback =
                  reactionUser?.firstName || reactionUser?.name || reactionUser?.userName || null
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
                      <Avatar source={reactionUserImage} fallback={reactionFallback} size={s.$1} />
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
