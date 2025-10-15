import * as React from 'react'
import { View, DimensionValue, Pressable, Text, FlatList } from 'react-native'
import { useCalendars } from 'expo-localization'
import { useFocusEffect } from '@react-navigation/native'

import { c, s } from '../style'
import { useAppStore } from '@/features/stores'
import SwipeableConversation from '@/ui/messaging/SwipeableConversation'
import { router } from 'expo-router'
import { useConversationPreviews } from '@/features/messaging/useConversationPreviews'
import { prefetchMessagesFirstPage } from '@/core/preload-controller'

export function ConversationsScreen() {
  const { archiveConversation, user } = useAppStore()
  const { previews, fetchNextPage, hasNextPage, isFetchingNextPage, isInitialLoading } =
    useConversationPreviews()
  const calendars = useCalendars()
  const timeZone = calendars[0]?.timeZone || 'America/New_York'

  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) return
      prefetchMessagesFirstPage(user.id).catch((error) => {
        if (__DEV__) {
          console.warn('[messages] prefetchMessagesFirstPage failed', error)
        }
      })
    }, [user?.id])
  )

  const handleArchive = async (conversationId: string) => {
    if (!user?.id) return
    await archiveConversation(user.id, conversationId)
  }

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
        data={previews}
        keyExtractor={(item) => item.conversation.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: s.$1, paddingVertical: s.$05 }}>
            <SwipeableConversation
              preview={item}
              onArchive={() => handleArchive(item.conversation.id)}
              timeZone={timeZone}
            />
          </View>
        )}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage()
          }
        }}
        contentContainerStyle={{ paddingBottom: s.$14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={{ padding: s.$2, alignItems: 'center' }}>
              <Text style={{ color: c.muted }}>Loading…</Text>
            </View>
          ) : (
            <View style={{ padding: s.$2, alignItems: 'center' }}>
              <Text style={{ color: c.muted }}>No conversations yet.</Text>
            </View>
          )
        }
      />
    </View>
  )
}
