import { Link, useGlobalSearchParams, router } from 'expo-router'
import { Text, View, Pressable } from 'react-native'
import { Avatar } from '../atoms/Avatar'
import { c, s } from '@/features/style'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { NavigationBackdrop } from '@/ui/navigation/NavigationBackdrop'
import { Badge } from '../atoms/Badge'
import { useMemo } from 'react'
import SavesIcon from '@/assets/icons/saves.svg'
import MessageIcon from '@/assets/icons/message.svg'

export const Navigation = () => {
  const { user } = useUserStore()

  const { addingTo, removingId } = useGlobalSearchParams()

  const { saves, messagesPerConversation, conversations, memberships } = useMessageStore()

  const countNewMessages = () => {
    if (!user) return 0
    if (!messagesPerConversation) return 0
    // messages not loaded yet
    if (Object.keys(memberships).length === 0) return 0
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

  if (!user) return null

  return (
    <View style={{ display: 'flex', flexDirection: 'row', paddingLeft: 2 }}>
      <NavigationBackdrop />
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: s.$6,
          width: '100%',
          paddingHorizontal: s.$1,
          alignItems: 'center',
          paddingBottom: s.$08,
          borderBottomColor: '#ddd',
          borderBottomWidth: 1,
        }}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Link dismissTo href="/">
            <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: "left" }}>Refs</Text>
          </Link>
        </View>
        <View style={{ top: 1, paddingRight: 14 }}>
          <Link href={`/user/${user.userName}`}>
            <Avatar source={user.image} size={26} />
          </Link>
        </View>
        <View style={{ display: "flex", flexDirection: "row", paddingRight: 16 }}>
          <Pressable onPress={() => router.push('/saves/modal')}>
            <View style={{ top: -1 }}>
              <SavesIcon width={24} height={24} />
            </View>
            <View
              style={{
                position: 'absolute',
                height: '85%',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={{ top: -4, right: -6, zIndex: 1 }}>
                {saves.length > 0 && <Badge count={saves.length} color='#7e8f78' />}
              </View>
            </View>
          </Pressable>
        </View>
        <View style={{ display: "flex", flexDirection: "row", paddingRight: 6 }}>
          <Pressable onPress={() => router.push('/messages')}>
            <View style={{ top: -1.5 }}>
              <MessageIcon width={30} />
            </View>
            {newMessages > 0 && <Badge count={newMessages} color={'#FF2244'} />}
          </Pressable>
        </View>
      </View>
    </View>
  )
}
