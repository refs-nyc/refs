import { useUserStore } from '@/features/pocketbase'
import { Conversation } from '@/features/pocketbase/stores/types'
import { s, c } from '@/features/style'
import { View, Text } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { Avatar } from '../atoms/Avatar'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { formatTimestamp } from '@/features/messaging/utils'
import { useCalendars } from 'expo-localization'
import { Pressable } from 'react-native-gesture-handler'
import { router } from 'expo-router'

export default function ConversationListItem({
  conversation,
}: {
  conversation: Conversation
}): JSX.Element | null {
  const { user } = useUserStore()
  const { memberships, messagesPerConversation } = useMessageStore()

  const messages = messagesPerConversation[conversation.id]

  const calendars = useCalendars()
  const timeZone = calendars[0].timeZone || 'America/New_York'

  if (!user) return null

  const lastMessage = messages[0]
  const time = lastMessage?.created
    ? lastMessage.created.slice(0, lastMessage.created.length - 1)
    : ''
  const members = memberships[conversation.id]
    .filter((m) => m.expand?.user && m.expand.user.id !== user.id)
    .map((m) => m.expand!.user)
  const ownMembership = memberships[conversation.id].filter((m) => m.expand?.user.id === user.id)[0]

  const lastMessageDate = new Date(lastMessage?.created ? lastMessage.created : '')
  const lastReadDate = new Date(ownMembership.last_read)
  const newMessages = lastMessageDate > lastReadDate && lastMessage?.sender !== user?.id

  let image
  for (const member of members) {
    if (member.image) {
      image = member.image
      break
    }
  }

  return (
    <Pressable onPress={() => router.push(`/messages/${conversation.id}`)}>
      <XStack
        style={{
          alignItems: 'center',
          backgroundColor: c.surface2,
          justifyContent: 'space-between',
          paddingHorizontal: s.$075,
          borderRadius: s.$075,
        }}
      >
        <XStack gap={s.$075} style={{ alignItems: 'center', maxWidth: '80%' }}>
          {newMessages && (
            <View
              style={{
                width: s.$075,
                height: s.$075,
                backgroundColor: c.accent,
                borderRadius: 100,
              }}
            ></View>
          )}
          <Avatar source={image} size={s.$5} />
          <YStack style={{ padding: s.$1 }}>
            <Text style={{ fontSize: s.$1 }}>
              {conversation.is_direct
                ? members[0].firstName + ' ' + members[0].lastName
                : conversation.title}
            </Text>
            <Text>{lastMessage?.text}</Text>
          </YStack>
        </XStack>
        <Text style={{ color: c.muted, margin: s.$05, alignSelf: 'flex-start' }}>
          {formatTimestamp(time, timeZone)}
        </Text>
      </XStack>
    </Pressable>
  )
}
