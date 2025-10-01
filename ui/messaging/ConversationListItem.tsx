import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/features/stores'
import { Conversation } from '@/features/types'
import { s, c } from '@/features/style'
import { View, Text } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { Avatar } from '../atoms/Avatar'
import { formatTimestamp } from '@/features/messaging/utils'
import { useCalendars } from 'expo-localization'
import { Pressable } from 'react-native-gesture-handler'
import { router } from 'expo-router'

export default function ConversationListItem({
  conversation,
}: {
  conversation: Conversation
}): JSX.Element | null {
  const { user, memberships, messagesPerConversation } = useAppStore()

  const liveMessages = messagesPerConversation[conversation.id] || []
  const liveMemberships = memberships[conversation.id] || []

  const [cachedMessages, setCachedMessages] = useState(liveMessages)
  useEffect(() => {
    if (liveMessages.length) setCachedMessages(liveMessages)
  }, [liveMessages])
  const messages = liveMessages.length ? liveMessages : cachedMessages

  const [cachedMemberships, setCachedMemberships] = useState(liveMemberships)
  useEffect(() => {
    if (liveMemberships.length) setCachedMemberships(liveMemberships)
  }, [liveMemberships])
  const conversationMemberships = liveMemberships.length ? liveMemberships : cachedMemberships

  const calendars = useCalendars()
  const timeZone = calendars[0].timeZone || 'America/New_York'

  if (!user) return null

  const lastMessage = messages[0]
  const time = lastMessage?.created
    ? lastMessage.created.slice(0, lastMessage.created.length - 1)
    : ''

  const members = conversationMemberships
    .filter((m) => m.expand?.user && m.expand.user.id !== user.id)
    .map((m) => m.expand!.user)
  const ownMembership = conversationMemberships.find((m) => m.expand?.user.id === user.id)

  const lastMessageDate = lastMessage?.created ? new Date(lastMessage.created) : null
  const lastReadDate = ownMembership?.last_read ? new Date(ownMembership.last_read) : null
  const newMessages =
    !!lastMessageDate && !!lastReadDate && lastMessageDate > lastReadDate && lastMessage?.sender !== user?.id

  const directAvatarSize = s.$5 as number
  const avatarSlotPadding = 5
  const avatarSlotWidth = directAvatarSize + avatarSlotPadding * 2

  const groupAvatarSources = useMemo(
    () =>
      conversation.is_direct
        ? []
        : members.map((member) => member.image).filter((src): src is string => !!src),
    [conversation.is_direct, members]
  )

  const displayTitle = conversation.is_direct && members[0]
    ? `${members[0].firstName ?? ''} ${members[0].lastName ?? ''}`.trim() || members[0].userName || conversation.title
    : conversation.title || 'Group chat'

  const displaySubtitle = lastMessage?.text
    ? lastMessage.text
    : conversation.is_direct
    ? ''
    : 'Start the conversation'

  const renderConversationAvatar = () => {
    if (conversation.is_direct) {
      const directImage = members.find((member) => member.image)?.image
      return <Avatar source={directImage} size={directAvatarSize} />
    }

    if (groupAvatarSources.length <= 1) {
      const source = groupAvatarSources[0]
      if (!source) return <View style={{ width: directAvatarSize, height: directAvatarSize }} />
      return <Avatar source={source} size={directAvatarSize} />
    }

    const extraCount = Math.max(groupAvatarSources.length - 3, 0)
    const showExtraBadge = extraCount > 0
    const displayedSources = showExtraBadge
      ? groupAvatarSources.slice(0, 2)
      : groupAvatarSources.slice(0, Math.min(groupAvatarSources.length, 3))

    const elements: (string | null)[] = [...displayedSources, ...(showExtraBadge ? [null] : [])]
    const elementCount = elements.length
    const elementSizeMultiplier = elementCount === 2 ? 0.54 : 0.4
    const elementSize = directAvatarSize * elementSizeMultiplier
    const overlap = elementCount === 2 ? elementSize * 0.18 : elementSize * 0.25
    const totalWidth = elementSize + (elementCount - 1) * (elementSize - overlap)
    const startOffset = (directAvatarSize - totalWidth) / 2
    const topOffset = (directAvatarSize - elementSize) / 2

    return (
      <View style={{ width: directAvatarSize, height: directAvatarSize }}>
        {elements.map((source, index) => {
          const left = startOffset + index * (elementSize - overlap)
          if (!source) {
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
            <View key={`${source}-${index}`} style={{ position: 'absolute', top: topOffset, left }}>
              <Avatar source={source} size={elementSize} />
            </View>
          )
        })}
      </View>
    )
  }

  const indicatorSize = s.$075 as number
  const textMarginBase = s.$075 as number
  const textMarginLeft = newMessages
    ? textMarginBase + indicatorSize + textMarginBase + avatarSlotPadding
    : textMarginBase + avatarSlotPadding

  return (
    <Pressable onPress={() => router.push(`/messages/${conversation.id}`)}>
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
          {newMessages && (
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
