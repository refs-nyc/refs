import { Heading, XStack } from '@/ui'
import { View, DimensionValue, Pressable } from 'react-native'
import { c, s } from '../style'
import { pocketbase, useUserStore } from '../pocketbase'
import { useMessageStore } from '../pocketbase/stores/messages'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Conversation } from '../pocketbase/stores/types'
import ConversationList from '@/ui/messaging/ConversationList'

export function ArchiveScreen() {
  const { user } = useUserStore()
  const { conversations, memberships, messagesPerConversation } = useMessageStore()

  const archivedConversations = []
  for (const conversationId in conversations) {
    const conversation = conversations[conversationId]
    const membership = memberships[conversationId].find((m) => m.expand?.user.id === user?.id)
    if (membership?.archived) archivedConversations.push(conversation)
  }

  const getLastMessageDate = (conversation: Conversation) => {
    const lastMessage = messagesPerConversation[conversation.id][0]
    return new Date(lastMessage?.created ? lastMessage.created : '').getTime()
  }

  archivedConversations.sort((a, b) => getLastMessageDate(b) - getLastMessageDate(a))

  const onUnarchive = async (conversation: Conversation) => {
    const membership = memberships[conversation.id].find((m) => m.expand?.user.id === user?.id)
    if (membership) {
      await pocketbase.collection('memberships').update(membership.id, { archived: false })
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
      <Pressable
        onPress={() => {
          router.dismissTo('/messages')
        }}
      >
        <XStack style={{ alignItems: 'center', justifyContent: 'flex-start', padding: s.$2 }}>
          <Ionicons name="chevron-back" size={s.$2} color={c.grey2} />
          <Heading tag="h1"> Archive </Heading>
        </XStack>
      </Pressable>
      <ConversationList>
        {archivedConversations.map((i) => (
          <SwipeableConversation
            key={i.id}
            conversation={i}
            onArchive={() => onUnarchive(i)}
            isInArchive={true}
          />
        ))}
      </ConversationList>
    </View>
  )
}
