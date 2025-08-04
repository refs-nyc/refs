import { Heading, XStack } from '@/ui'
import { View, DimensionValue, Pressable, Text } from 'react-native'
import { s } from '../style'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { router } from 'expo-router'
import { Conversation, Message } from '@/features/types'
import ConversationList from '@/ui/messaging/ConversationList'
import { useEffect, useState } from 'react'

export function ConversationsScreen() {
  const { user, archiveConversation, canvasApp, membershipsByUserId, conversationsById } =
    useAppStore()

  const [activeConversations, setActiveConversations] = useState<Conversation[]>([])

  useEffect(() => {
    async function getActiveConversations() {
      if (!canvasApp || !user) {
        setActiveConversations([])
        return
      }

      const activeConversations = []
      for (const membership of membershipsByUserId[user.did] || []) {
        if (membership.archived) continue

        const conversation = conversationsById[membership.conversation as string]

        if (!conversation) continue
        const lastMessage = (
          await canvasApp.db.query<Message>('message', {
            where: { conversation: membership.conversation },
            orderBy: { created: 'desc' },
            limit: 1,
          })
        )[0]
        const lastMessageDate = new Date(lastMessage?.created ? lastMessage.created : '').getTime()
        activeConversations.push({ conversation, lastMessageDate })
      }

      activeConversations.sort((a, b) => b.lastMessageDate - a.lastMessageDate)
      setActiveConversations(activeConversations.map(({ conversation }) => conversation))
    }
    getActiveConversations()
  }, [canvasApp])

  const onArchive = async (conversation: Conversation) => {
    if (user) {
      await archiveConversation(user, conversation.id)
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
