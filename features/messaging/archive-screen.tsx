import { View, DimensionValue, Pressable, Text } from 'react-native'
import { c, s } from '../style'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
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
    const conversationMemberships = memberships[conversationId] || []
    const membership = conversationMemberships.find((m) => m.expand?.user.id === user?.id)
    const hasMessages = (messagesPerConversation[conversationId] || []).length > 0
    if (membership?.archived && hasMessages) archivedConversations.push(conversation)
  }

  const getLastMessageDate = (conversation: Conversation) => {
    const conversationMessages = messagesPerConversation[conversation.id] || []
    const lastMessage = conversationMessages[0]
    return lastMessage?.created ? new Date(lastMessage.created).getTime() : 0
  }

  archivedConversations.sort((a, b) => getLastMessageDate(b) - getLastMessageDate(a))

  const onUnarchive = async (conversation: Conversation) => {
    if (user) {
      await unarchiveConversation(user.id, conversation.id)
    }
  }

  if (!user) return null

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        height: s.full as DimensionValue,
        backgroundColor: c.surface,
      }}
    >
      <View style={{ paddingTop: 28, paddingHorizontal: s.$1 + 6, marginBottom: s.$075 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={{ color: c.prompt, fontSize: (s.$09 as number) + 4, fontWeight: '700' }}>Archive</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: c.prompt, fontSize: s.$09, fontWeight: '400' }}>Back</Text>
          </Pressable>
        </View>
      </View>

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
