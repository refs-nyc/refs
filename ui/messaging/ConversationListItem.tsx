import { useAppStore } from '@/features/stores'
import { Conversation, DecryptedMessage, ExpandedMembership, Message } from '@/features/types'
import { s, c } from '@/features/style'
import { View, Text } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { Avatar } from '../atoms/Avatar'
import { formatTimestamp } from '@/features/messaging/utils'
import { useCalendars } from 'expo-localization'
import { Pressable } from 'react-native-gesture-handler'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'

export default function ConversationListItem({
  conversation,
}: {
  conversation: Conversation
}): JSX.Element | null {
  const { user, getLastMessageForConversation, getMembers } = useAppStore()

  const [lastMessage, setLastMessage] = useState<DecryptedMessage | null>(null)
  const [conversationMemberships, setConversationMemberships] = useState<ExpandedMembership[]>([])

  useEffect(() => {
    async function updateMessages() {
      setLastMessage(await getLastMessageForConversation(conversation.id))
      setConversationMemberships(await getMembers(conversation.id))
    }
    updateMessages()
  }, [conversation])

  const calendars = useCalendars()
  const timeZone = calendars[0].timeZone || 'America/New_York'

  if (!user) return null

  const time = lastMessage?.created
    ? lastMessage.created.slice(0, lastMessage.created.length - 1)
    : ''
  const members = conversationMemberships
    .filter((m) => m.expand?.user && m.expand.user.did !== user.did)
    .map((m) => m.expand!.user)
  const ownMembership = conversationMemberships.filter((m) => m.expand?.user.did === user.did)[0]

  const lastMessageDate = new Date(lastMessage?.created ? lastMessage.created : '')
  const lastReadDate = new Date(ownMembership.last_read!)
  const hasNewMessages = lastMessageDate > lastReadDate && lastMessage?.sender !== user?.did

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
          {hasNewMessages && (
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
            <Text>{lastMessage ? lastMessage.expand.decryptedData.text : ''}</Text>
          </YStack>
        </XStack>
        <Text style={{ color: c.muted, margin: s.$05, alignSelf: 'flex-start' }}>
          {formatTimestamp(time, timeZone)}
        </Text>
      </XStack>
    </Pressable>
  )
}
