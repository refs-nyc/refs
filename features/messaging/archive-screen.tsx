import { Heading, XStack } from '@/ui'
import { View, DimensionValue, Pressable } from 'react-native'
import { c, s } from '../style'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Conversation } from '@/features/types'
import ConversationList from '@/ui/messaging/ConversationList'

export function ArchiveScreen() {
  const { user } = useAppStore()
  const { conversations, memberships, messagesPerConversation, unarchiveConversation } =
    useAppStore()

  const archivedConversations = []
  for (const conversationId in conversations) {
    const conversation = conversations[conversationId]
    const membership = memberships[conversationId].find((m) => m.expand?.user.did === user?.did)
    if (membership?.archived) archivedConversations.push(conversation)
  }

  const getLastMessageDate = (conversation: Conversation) => {
    const lastMessage = messagesPerConversation[conversation.id][0]
    return new Date(lastMessage?.created ? lastMessage.created : '').getTime()
  }

  archivedConversations.sort((a, b) => getLastMessageDate(b) - getLastMessageDate(a))

  const onUnarchive = async (conversation: Conversation) => {
    if (user) {
      await unarchiveConversation(user, conversation.id)
    }
  }

  if (!user) return null

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        height: s.full as DimensionValue,
      }}
    >
      <XStack
        gap={s.$1}
        style={{
          alignItems: 'center',
          paddingBottom: s.$1,
          paddingLeft: s.$1,
          paddingTop: s.$1,
        }}
      >
        <Heading tag="h2semi">Archive</Heading>
      </XStack>

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
