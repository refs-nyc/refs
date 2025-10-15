import { useCallback, useMemo } from 'react'
import { View, Text } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'

import { useAppStore } from '@/features/stores'
import { s, c } from '@/features/style'
import { XStack, YStack } from '../core/Stacks'
import { Avatar } from '../atoms/Avatar'
import { formatTimestamp } from '@/features/messaging/utils'
import type { ConversationPreviewSnapshot } from '@/features/messaging/useConversationPreviews'
import type { Message } from '@/features/types'
import {
  messagingKeys,
  fetchConversation,
  fetchConversationMessages,
  type ConversationsPage,
  type ConversationMessagesPage,
} from '@/features/queries/messaging'

export default function ConversationListItem({
  preview,
  timeZone,
}: {
  preview: ConversationPreviewSnapshot
  timeZone: string
}): JSX.Element | null {
  const user = useAppStore((state) => state.user)
  const queryClient = useQueryClient()
  if (!user) return null

  const conversation = preview.conversation
  const conversationId = conversation.id
  const lastMessage = preview.latestMessage
  const time = lastMessage?.created ? lastMessage.created.slice(0, -1) : ''

  const members = preview.memberships
    .filter((membership) => membership.expand?.user && membership.expand.user.id !== user.id)
    .map((membership) => membership.expand!.user)
  const unreadCount = preview.unreadCount ?? 0
  const hasUnread = unreadCount > 0

  const directAvatarSize = nearestBucket((s.$5 as number) ?? AVATAR_PX)
  const avatarSlotPadding = 5
  const avatarSlotWidth = directAvatarSize + avatarSlotPadding * 2

  const groupAvatars = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        source: member.image || (member as any)?.avatar_url || '',
        fallback: member.firstName || member.name || member.userName || '',
      })),
    [members]
  )

  const isDirect = Boolean(conversation.is_direct)

  const displayTitle = isDirect && members[0]
    ? `${members[0].firstName ?? ''} ${members[0].lastName ?? ''}`.trim() || members[0].userName || conversation.title
    : conversation.title || 'Group chat'

  const displaySubtitle = deriveSubtitle(lastMessage, isDirect)

  const renderConversationAvatar = () => {
    if (isDirect) {
      const directMember = members[0]
      const directSource = directMember?.image || (directMember as any)?.avatar_url || ''
      const directFallback = directMember
        ? directMember.firstName || directMember.name || directMember.userName
        : null
      return <Avatar source={directSource} fallback={directFallback} size={directAvatarSize} />
    }

    if (groupAvatars.length <= 1) {
      const single = groupAvatars[0]
      if (!single?.source) return <View style={{ width: directAvatarSize, height: directAvatarSize }} />
      return <Avatar source={single.source} fallback={single.fallback} size={directAvatarSize} />
    }

    const extraCount = Math.max(groupAvatars.length - 3, 0)
    const showExtraBadge = extraCount > 0
    const displayedAvatars = showExtraBadge
      ? groupAvatars.slice(0, 2)
      : groupAvatars.slice(0, Math.min(groupAvatars.length, 3))

    const elements = [...displayedAvatars, ...(showExtraBadge ? [null] : [])]
    const elementCount = elements.length
    const elementSizeMultiplier = elementCount === 2 ? 0.54 : 0.4
    const elementSize = directAvatarSize * elementSizeMultiplier
    const overlap = elementCount === 2 ? elementSize * 0.18 : elementSize * 0.25
    const totalWidth = elementSize + (elementCount - 1) * (elementSize - overlap)
    const startOffset = (directAvatarSize - totalWidth) / 2
    const topOffset = (directAvatarSize - elementSize) / 2

    return (
      <View style={{ width: directAvatarSize, height: directAvatarSize }}>
        {elements.map((entry, index) => {
          const left = startOffset + index * (elementSize - overlap)
          if (!entry) {
            return (
              <View
                key={`extra-${index}`}
                style={{
                  position: 'absolute',
                  top: topOffset,
                  left,
                  width: elementSize,
                  height: elementSize,
                  borderRadius: elementSize / 2,
                  backgroundColor: c.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: c.muted, fontSize: s.$08 }}>+{extraCount}</Text>
              </View>
            )
          }

          return (
            <View key={`${entry.id}-${index}`} style={{ position: 'absolute', top: topOffset, left }}>
              <Avatar source={entry.source} fallback={entry.fallback} size={elementSize} />
            </View>
          )
        })}
      </View>
    )
  }

  const indicatorSize = s.$075 as number
  const textMarginBase = s.$075 as number
  const textMarginLeft = hasUnread
    ? textMarginBase + indicatorSize + textMarginBase + avatarSlotPadding
    : textMarginBase + avatarSlotPadding

  const handlePress = useCallback(() => {
    queryClient
      .prefetchQuery({
        queryKey: messagingKeys.conversation(conversationId),
        queryFn: () => fetchConversation(conversationId),
        staleTime: 60_000,
        gcTime: 30 * 60_000,
      })
      .catch(() => {})

    queryClient
      .prefetchInfiniteQuery<ConversationMessagesPage>({
        queryKey: messagingKeys.messages(conversationId),
        queryFn: ({ pageParam }) =>
          fetchConversationMessages(conversationId, pageParam as string | undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: ConversationMessagesPage) => lastPage.nextCursor,
        staleTime: 30_000,
        gcTime: 30 * 60_000,
      })
      .catch(() => {})

    router.push(`/messages/${conversationId}`)
  }, [conversationId, queryClient])

  return (
    <Pressable onPress={handlePress}>
      <XStack
        style={{
          alignItems: 'center',
          backgroundColor: 'rgba(176,176,176,0.1)',
          justifyContent: 'space-between',
          paddingHorizontal: s.$075,
          borderRadius: 15,
          paddingVertical: s.$075,
        }}
      >
        <XStack gap={0} style={{ alignItems: 'center', maxWidth: '80%' }}>
          {hasUnread && (
            <View
              style={{
                width: indicatorSize,
                height: indicatorSize,
                backgroundColor: c.accent,
                borderRadius: 100,
                marginRight: textMarginBase,
              }}
            />
          )}
          <View
            style={{
              width: avatarSlotWidth,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: avatarSlotPadding,
            }}
          >
            {renderConversationAvatar()}
          </View>
          <YStack
            style={{
              paddingVertical: s.$1,
              paddingRight: s.$1,
              marginLeft: textMarginLeft,
              flexShrink: 1,
            }}
          >
            <Text style={{ fontSize: s.$1 }} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text numberOfLines={1} style={{ color: c.muted }}>
              {displaySubtitle}
            </Text>
          </YStack>
        </XStack>
        <Text style={{ color: c.muted, margin: s.$05, alignSelf: 'flex-start' }}>
          {time ? formatTimestamp(time, timeZone) : ''}
        </Text>
      </XStack>
    </Pressable>
  )
}

function deriveSubtitle(message: Message | null | undefined, isDirect: boolean) {
  if (!message) {
    return isDirect ? '' : 'Start the conversation'
  }

  if (message.text && message.text.trim().length > 0) {
    return message.text
  }

  if (message.image) {
    return 'Shared a photo'
  }

  return ''
}
import { AVATAR_PX, nearestBucket } from '@/ui/images/avatar-sizes'
