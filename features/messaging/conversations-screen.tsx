import { Heading, XStack } from '@/ui'
import { View, DimensionValue, Pressable, Text } from 'react-native'
import { s } from '../style'
import { pocketbase, useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { router } from 'expo-router'
import { Conversation } from '../pocketbase/stores/types'
import ConversationList from '@/ui/messaging/ConversationList'

export function ConversationsScreen() {
  const { user } = useUserStore()
  const { conversations, memberships, messagesPerConversation } = useMessageStore()

  const activeConversations = []
  for (const conversationId in conversations) {
    const conversation = conversations[conversationId]
    const membership = memberships[conversationId].find((m) => m.expand?.user.id === user?.id)
    if (membership && !membership.archived) activeConversations.push(conversation)
  }

  const getLastMessageDate = (conversation: Conversation) => {
    const lastMessage = messagesPerConversation[conversation.id][0]
    return new Date(lastMessage?.created ? lastMessage.created : '').getTime()
  }

  activeConversations.sort((a, b) => getLastMessageDate(b) - getLastMessageDate(a))

  const onArchive = async (conversation: Conversation) => {
    const membership = memberships[conversation.id].find((m) => m.expand?.user.id === user?.id)
    if (membership) {
      await pocketbase.collection('memberships').update(membership.id, { archived: true })
    }
  }

  if (!user) return null

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: s.$8,
        height: s.full as DimensionValue,
      }}
    >
      <XStack style={{ alignItems: 'center', justifyContent: 'space-between', padding: s.$2 }}>
        <Heading tag="h1" style={{ paddingVertical: 0 }}>
          Messages
        </Heading>
        <Pressable
          onPress={() => {
            router.push('/messages/archive')
          }}
        >
          <Text>Archive</Text>
        </Pressable>
      </XStack>
      <ConversationList>
        {activeConversations.map((i) => (
          <SwipeableConversation key={i.id} conversation={i} onArchive={() => onArchive(i)} />
        ))}
      </ConversationList>
    </View>
  )
}
