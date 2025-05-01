import { Link, usePathname, useGlobalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { Icon } from '@/assets/icomoon/IconFont'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { Badge } from '../atoms/Badge'
import { useMemo } from 'react'

export const Navigation = () => {
  const { user } = useUserStore()

  const pathName = usePathname()
  const { addingTo, removingId } = useGlobalSearchParams()

  const { messagesPerConversation, conversations, memberships } = useMessageStore()

  const countNewMessages = () => {
    if (!user) return 0
    if (!messagesPerConversation) return 0
    let newMessages = 0
    for (const conversationId in conversations) {
      const lastRead = memberships[conversationId].find(
        (m) => m.expand?.user.id === user?.id
      )?.last_read
      const lastReadDate = new Date(lastRead || '')
      const conversationMessages = messagesPerConversation[conversationId]
      if (!conversationMessages) continue
      let unreadMessages
      if (lastRead) {
        const msgs = conversationMessages.filter(
          (m) => new Date(m.created!) > lastReadDate && m.sender !== user?.id
        )
        unreadMessages = msgs.length
      } else unreadMessages = conversationMessages.length
      newMessages += unreadMessages
    }
    return newMessages
  }
  const newMessages = useMemo(
    () => countNewMessages(),
    [messagesPerConversation, memberships, user]
  )

  if (
    !user ||
    pathName.includes('/onboarding') ||
    pathName.includes('/user/login') ||
    pathName.includes('/user/register') ||
    (pathName.includes('/modal') && !pathName.includes('/saves/modal')) || // want the navbar to stay visible under the saves modal
    pathName.includes('/messages/') || // e.g. /messages/123
    addingTo === 'grid' ||
    addingTo === 'backlog' ||
    !!removingId
  ) {
    return <></>
  }

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        marginTop: s.$6,
        paddingHorizontal: s.$1,
        alignItems: 'center',
      }}
    >
      <View>
        <Link dismissTo href={`/`}>
          <Avatar source={user.image} size={42} />
        </Link>
      </View>
      <View style={{ margin: 'auto' }}>
        <Link dismissTo href="/feed">
          <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Refs</Text>
        </Link>
      </View>
      <View style={{ top: -2 }}>
        <Link dismissTo href="/messages">
          <Icon name="Messages" size={39} color={c.muted2} />
        </Link>
        {newMessages > 0 && <Badge count={newMessages} color={c.red} />}
      </View>
    </View>
  )
}
