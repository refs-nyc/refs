import { pocketbase, useUserStore } from '@/features/pocketbase'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { Profile } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { XStack, YStack } from '@/ui'
import { Avatar } from '@/ui/atoms/Avatar'
import MessageInput from '@/ui/messaging/MessageInput'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, Text, DimensionValue, TextInput } from 'react-native'

export default function NewGCScreen() {
  const queryParams = useLocalSearchParams()
  const [users, setUsers] = useState<Profile[]>([])
  const [message, setMessage] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const { createConversation, sendMessage } = useMessageStore()
  const { user } = useUserStore()

  useEffect(() => {
    const getUsers = async () => {
      const ids =
        typeof queryParams.members === 'string'
          ? queryParams.members.split(',')
          : queryParams.members

      const filter = ids.map((id) => `id="${id}"`).join(' || ')
      const result = await pocketbase.collection('users').getFullList<Profile>({
        filter: filter,
      })
      setUsers(result)
    }
    getUsers()
  }, [])

  const getUserListString = (users: Profile[]) => {
    let s = `Chat with ${users[0].firstName}`
    for (let i = 1; i < users.length - 1; i++) {
      s += `, ${users[i].firstName}`
      if (i > 1) break
    }
    if (users.length > 1)
      s +=
        ' and ' +
        (users.length > 3 ? `${users.length - 3} others` : users[users.length - 1].firstName)

    return s
  }

  const onMessageSubmit = async () => {
    const conversationId = await createConversation(
      false,
      user!.id,
      [...users.map((u) => u.id)],
      title
    )
    await sendMessage(user!.id, conversationId, message)
    router.replace(`/messages/${conversationId}`)
  }

  if (!user || !users.length) return null

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        paddingTop: s.$8,
        height: s.full as DimensionValue,
        backgroundColor: c.surface,
      }}
    >
      <YStack
        gap={s.$3half}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'start', paddingTop: s.$5 }}
      >
        <TextInput
          placeholder="What's it about?"
          value={title}
          onChangeText={setTitle}
          style={{
            width: '70%',
            paddingVertical: s.$2,
            fontSize: s.$2,
            fontWeight: 'bold',
          }}
        />

        <Text>{getUserListString(users)}</Text>
        <XStack>
          {users.map((u) => (
            <Link key={u.id} href={`/user/${u.userName}`}>
              <Avatar source={u.image} size={s.$4} />
            </Link>
          ))}
        </XStack>
        <MessageInput
          onMessageSubmit={onMessageSubmit}
          setMessage={setMessage}
          message={message}
          disabled={!message}
        />
      </YStack>
    </View>
  )
}
