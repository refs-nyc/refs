import { pocketbase, useUserStore } from '@/features/pocketbase'
import { useMessageStore } from '@/features/pocketbase/stores/messages'
import { c, s } from '@/features/style'
import { Heading, XStack, YStack } from '@/ui'
import { Avatar } from '@/ui/atoms/Avatar'
import MessageInput from '@/ui/messaging/MessageInput'
import { Ionicons } from '@expo/vector-icons'
import { router, useGlobalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { DimensionValue, Pressable, View } from 'react-native'

export default function NewDMScreen() {
  const { user } = useUserStore()
  const { userName } = useGlobalSearchParams()
  const [message, setMessage] = useState<string>('')
  const { createConversation, sendMessage } = useMessageStore()
  const [profile, setProfile] = useState<any>()

  useEffect(() => {
    async function getProfile() {
      const results = await pocketbase.collection('users').getFullList({
        filter: `userName = "${userName}"`,
      })
      setProfile(results[0])
    }
    getProfile()
  }, [userName])

  if (!user) {
    router.dismissTo('/')
    return
  }

  if (userName === user.userName) {
    router.dismissTo('/')
    return
  }

  if (!profile) return null

  const onMessageSubmit = async () => {
    const conversationId = await createConversation(true, user.id, [profile.id])
    await sendMessage(user.id, conversationId, message)
    router.replace(`/messages/${conversationId}`)
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
      <YStack
        style={{
          flex: 1,
          margin: 'auto',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingHorizontal: s.$1,
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
          <Heading tag="h2semi">New Message</Heading>
        </XStack>
        <XStack
          gap={s.$1}
          style={{ alignItems: 'center', justifyContent: 'space-between', padding: s.$1 }}
        >
          <Avatar source={profile.image} size={s.$4} />
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
