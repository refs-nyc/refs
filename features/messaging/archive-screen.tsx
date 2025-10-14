import { useMemo } from 'react'
import { View, DimensionValue, Pressable, Text, FlatList } from 'react-native'
import { c, s } from '../style'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { router } from 'expo-router'
import { useCalendars } from 'expo-localization'
import { useConversationPreviews } from '@/features/messaging/useConversationPreviews'
import type { ConversationPreviewSnapshot } from '@/features/messaging/useConversationPreviews'

export function ArchiveScreen() {
  const { user, unarchiveConversation } = useAppStore()
  const { previews } = useConversationPreviews()
  const calendars = useCalendars()
  const timeZone = calendars[0]?.timeZone || 'America/New_York'

  const archivedConversations = useMemo<ConversationPreviewSnapshot[]>(() => {
    if (!user?.id) return []
    const archived = previews.filter((entry) => {
      const membership = entry.memberships.find((member) => member.expand?.user.id === user.id)
      return Boolean(membership?.archived)
    })

    return archived.sort((a, b) => {
      const aTime = a.latestMessage?.created ? new Date(a.latestMessage.created).getTime() : 0
      const bTime = b.latestMessage?.created ? new Date(b.latestMessage.created).getTime() : 0
      return bTime - aTime
    })
  }, [previews, user?.id])

  const onUnarchive = async (conversationId: string) => {
    if (user?.id) {
      await unarchiveConversation(user.id, conversationId)
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
        keyExtractor={(item) => item.conversation.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: s.$1, paddingVertical: s.$05 }}>
            <SwipeableConversation
              preview={item}
              onArchive={() => onUnarchive(item.conversation.id)}
              isInArchive
              timeZone={timeZone}
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
