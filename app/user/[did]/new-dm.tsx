import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { Heading, XStack, YStack } from '@/ui'
import { Avatar } from '@/ui/atoms/Avatar'
import MessageInput from '@/ui/messaging/MessageInput'
import { router, useGlobalSearchParams } from 'expo-router'
import { useState } from 'react'
import { DimensionValue, View } from 'react-native'

export default function NewDMScreen() {
  const { user } = useAppStore()
  const { did } = useGlobalSearchParams()
  const [message, setMessage] = useState<string>('')
  const { createConversation, sendMessage, getUserByDid } = useAppStore()
  const profile = typeof did === 'string' ? getUserByDid(did) : null

  if (!user) {
    router.dismissTo('/')
    return
  }

  if (did === user.did) {
    router.dismissTo('/')
    return
  }

  if (!profile) return null

  const onMessageSubmit = async () => {
    const conversationId = await createConversation(true, [profile])
    await sendMessage({ conversationId, text: message })
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
