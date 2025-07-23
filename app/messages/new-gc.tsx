import { useAppStore } from '@/features/stores'
import { Profile } from '@/features/types'
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
  const { user, createConversation, sendMessage, getUsersByDids } = useAppStore()

  useEffect(() => {
    const getUsers = async () => {
      const ids =
        typeof queryParams.members === 'string'
          ? queryParams.members.split(',')
          : queryParams.members

      const users = await getUsersByDids(ids)
      setUsers(users)
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
    const conversationId = await createConversation(false, user!, users, title)
    await sendMessage({ conversationId, text: message })
    router.replace(`/messages/${conversationId}`)
  }

  if (!user || !users.length) return null

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        height: s.full as DimensionValue,
        backgroundColor: c.surface,
      }}
    >
      <YStack
        gap={s.$2}
        style={{
          flex: 1,
          alignItems: 'flex-start',
          width: '80%',
          paddingTop: s.$5,
          margin: 'auto',
        }}
      >
        <TextInput
          placeholder="What's it about?"
          value={title}
          onChangeText={setTitle}
          style={{
            width: '70%',
            fontSize: s.$2,
            fontWeight: 'bold',
          }}
        />

        <Text>{getUserListString(users)}</Text>
        <XStack gap={s.$05} style={{ flexWrap: 'wrap' }}>
          {users.map((u) => (
            <Link key={u.did} href={`/user/${u.did}`}>
              <Avatar source={u.image} size={s.$3} />
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
