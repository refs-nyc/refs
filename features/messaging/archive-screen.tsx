import { useMemo } from 'react'
import { View, DimensionValue, Pressable, Text, FlatList } from 'react-native'
import { c, s } from '../style'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { router } from 'expo-router'
import { Conversation } from '@/features/types'

export function ArchiveScreen() {
  const { user } = useAppStore()
  const { conversations, memberships, messagesPerConversation, unarchiveConversation } =
    useAppStore()

  const archivedConversations = useMemo(() => {
    const result: Conversation[] = []
    for (const conversationId in conversations) {
      const conversation = conversations[conversationId]
      const conversationMemberships = memberships[conversationId] || []
      const membership = conversationMemberships.find((m) => m.expand?.user.id === user?.id)
      const hasMessages = (messagesPerConversation[conversationId] || []).length > 0
      if (membership?.archived && hasMessages) {
        result.push(conversation)
      }
    }

    const getLastMessageDate = (conversation: Conversation) => {
      const conversationMessages = messagesPerConversation[conversation.id] || []
      const lastMessage = conversationMessages[0]
      return lastMessage?.created ? new Date(lastMessage.created).getTime() : 0
    }

    result.sort((a, b) => getLastMessageDate(b) - getLastMessageDate(a))
    return result
  }, [conversations, memberships, messagesPerConversation, user?.id])

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
      <FlatList
        data={archivedConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: s.$1, paddingVertical: s.$05 }}>
            <SwipeableConversation
              conversation={item}
              onArchive={() => onUnarchive(item)}
              isInArchive
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: s.$14 }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}
