import { Button, View, Input, Paragraph } from '@my/ui'
import { useRouter } from 'solito/router'

import 'event-target-polyfill'
import 'fast-text-encoding'

// import { Image, StyleSheet, Platform } from 'react-native'
import { useState } from 'react'

import { useCanvas, useLiveQuery } from '@canvas-js/hooks'
import type { Actions, DeriveModelTypes, ModelSchema } from '@canvas-js/core'

export function HomeScreen({ pagesMode = false }: { pagesMode?: boolean }) {
  // const router = useRouter()

  // const linkTarget = pagesMode ? '/pages-example-user' : '/user'

  const models = {
    message: {
      id: 'primary',
      address: 'string',
      content: 'string',
      timestamp: 'integer',
      $indexes: ['address', 'timestamp'],
    },
  } satisfies ModelSchema

  const actions = {
    async createMessage(db, content) {
      const { id, address, timestamp } = this
      await db.set('message', { id, address, content, timestamp })
    },
  } satisfies Actions<typeof models>

  const wsURL = 'wss://canvas-chat-example.p2p.app'

  const { app } = useCanvas(wsURL, {
    reset: true,
    contract: { models, actions },
    topic: 'chat-example.canvas.xyz',
  })

  const messages = useLiveQuery<DeriveModelTypes<typeof models>['message']>(app, 'message', {
    orderBy: { timestamp: 'desc' },
  })

  const [messageInput, setMessageInput] = useState('')

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Input
        size="$4"
        borderWidth={2}
        w="$20"
        placeholder="Type a message..."
        autoFocus={true}
        value={messageInput}
        onChangeText={setMessageInput}
      />
      <Button
        size="$4"
        onPress={() => {
          if (messageInput.trim()) {
            app?.actions.createMessage(messageInput)
            setMessageInput('')
          }
        }}
      >
        Send
      </Button>
      {messages?.map((message) => {
        return (
          <Paragraph key={message.id} size="$3" fontWeight="bold">
            {message.address?.slice(0, 8)}: {message.content}
          </Paragraph>
        )
      })}
    </View>
  )
}
