import { Heading, XStack } from '@/ui'
import { View, DimensionValue, Pressable, Text } from 'react-native'
import { c, s } from '../style'
import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { router } from 'expo-router'
import { Conversation } from '@/features/pocketbase/types'
import ConversationList from '@/ui/messaging/ConversationList'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'

export function ConversationsScreen() {
  const { conversations, memberships, messagesPerConversation, user } = useAppStore()

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
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 8,
            paddingRight: s.$2,
          }}
        >
          <View style={{ flex: 1 }}>
            <Heading tag="h2semi">Messages</Heading>
          </View>
          <Pressable
            onPress={() => {
              router.push('/messages/archive')
            }}
          >
            <Text>Archive</Text>
          </Pressable>
        </View>
      </XStack>
      <ConversationList>
        {activeConversations.map((i) => (
          <SwipeableConversation key={i.id} conversation={i} onArchive={() => onArchive(i)} />
        ))}
      </ConversationList>
    </View>
  )
}
