import { Heading, XStack } from '@/ui'
import { View, DimensionValue } from 'react-native'
import { s } from '../style'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { Conversation, Message } from '@/features/types'
import ConversationList from '@/ui/messaging/ConversationList'
import { useEffect, useState } from 'react'

export function ArchiveScreen() {
  const { user, unarchiveConversation, canvasApp, conversationsById, membershipsByUserId } =
    useAppStore()

  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([])

  useEffect(() => {
    async function getArchivedConversations() {
      if (!canvasApp) return
      if (!user) return

      const archivedConversations = []
      for (const membership of membershipsByUserId[user.did] || []) {
        if (!membership.archived) continue

        const conversation = conversationsById[membership.conversation as string]

        const lastMessage = (
          await canvasApp.db.query<Message>('message', {
            where: { conversation: membership.conversation as string },
            orderBy: { created: 'desc' },
            limit: 1,
          })
        )[0]

        const lastMessageDate = new Date(lastMessage?.created ? lastMessage.created : '').getTime()
        if (conversation)
          archivedConversations.push({
            conversation,
            lastMessageDate,
          })
      }

      archivedConversations.sort((a, b) => b.lastMessageDate - a.lastMessageDate)

      setArchivedConversations(archivedConversations.map(({ conversation }) => conversation))
    }
    getArchivedConversations()
  }, [canvasApp])

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
