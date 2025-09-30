import { useMemo } from 'react'
import { View, DimensionValue, Pressable, Text, FlatList } from 'react-native'
import { c, s } from '../style'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { router } from 'expo-router'
import { Conversation } from '@/features/types'

export function ConversationsScreen() {
  const { conversations, memberships, messagesPerConversation, user, archiveConversation } =
    useAppStore()

  const activeConversations = useMemo(() => {
    const result: Conversation[] = []
    for (const conversationId in conversations) {
      const conversation = conversations[conversationId]
      const conversationMemberships = memberships[conversationId] || []
      const membership = conversationMemberships.find((m) => m.expand?.user.id === user?.id)
      if (membership && !membership.archived) {
        result.push(conversation)
      }
    }

    const getLastMessageDate = (conversation: Conversation) => {
      const conversationMessages = messagesPerConversation[conversation.id] || []
      const lastMessage = conversationMessages[0]
      if (lastMessage?.created) return new Date(lastMessage.created).getTime()
      const updated = (conversation as any)?.updated
      if (updated) return new Date(updated).getTime()
      const created = (conversation as any)?.created
      if (created) return new Date(created).getTime()
      return 0
    }

    result.sort((a, b) => getLastMessageDate(b) - getLastMessageDate(a))
    return result
  }, [conversations, memberships, messagesPerConversation, user?.id])

  const onArchive = async (conversation: Conversation) => {
    if (user) {
      await archiveConversation(user.id, conversation.id)
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
      <View
        style={{
          paddingVertical: s.$1,
          justifyContent: 'center',
          marginTop: 7,
          paddingLeft: s.$1 + 6,
          paddingRight: s.$1 + 6,
          marginBottom: s.$075,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: c.prompt,
              fontSize: (s.$09 as number) + 4,
              fontFamily: 'System',
              fontWeight: '700',
              textAlign: 'left',
              lineHeight: s.$1half,
            }}
          >
            Messages
          </Text>
          <Pressable
            onPress={() => {
              router.push('/messages/archive')
            }}
            style={{ paddingVertical: s.$05, paddingHorizontal: s.$05 }}
          >
            <Text
              style={{
                color: c.prompt,
                fontSize: s.$09,
                fontFamily: 'System',
                fontWeight: '400',
                lineHeight: s.$1half,
              }}
            >
              Archive
            </Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        data={activeConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: s.$1, paddingVertical: s.$05 }}>
            <SwipeableConversation conversation={item} onArchive={() => onArchive(item)} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: s.$14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}
