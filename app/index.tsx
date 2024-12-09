import { install } from "react-native-quick-crypto"
install()

import { polyfill as polyfillEncoding } from "react-native-polyfill-globals/src/encoding"
polyfillEncoding()

import "event-target-polyfill"
import "./custom-event-polyfill"

import { Button, Text, View, Image, StyleSheet, Platform } from "react-native"
import { useState } from "react"

import { useCanvas, useLiveQuery } from "@canvas-js/hooks"
import type { Actions, DeriveModelTypes, ModelSchema } from "@canvas-js/core"

import { useDrizzleStudio } from "expo-drizzle-studio-plugin"
import * as SQLite from "expo-sqlite"

const db = SQLite.openDatabaseSync(":memory:")

export default function Index() {
  useDrizzleStudio(db)

  const models = {
    message: {
      id: "primary",
      address: "string",
      content: "string",
      timestamp: "integer",
      $indexes: ["address", "timestamp"],
    },
  } satisfies ModelSchema

  const actions = {
    async createMessage(db, content) {
      const { id, address, timestamp } = this
      await db.set("message", { id, address, content, timestamp })
    },
  } satisfies Actions<typeof models>

  const wsURL = "wss://canvas-chat-example.p2p.app"

  const { app } = useCanvas(wsURL, {
    contract: { models, actions },
    topic: "chat-example.canvas.xyz",
  })

  const messages = useLiveQuery<DeriveModelTypes<typeof models>["message"]>(
    app,
    "message",
    {
      orderBy: { timestamp: "desc" },
    },
  )

  const [messageInput, setMessageInput] = useState("")

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Engine: {global.isHermes}</Text>
      {/*<Input
        size="$4"
        borderWidth={2}
        w="$20"
        placeholder="Type a message..."
        autoFocus={true}
        value={messageInput}
        onChangeText={setMessageInput}
      />*/}
      <Button
        title="Send"
        onPress={() => {
          if (messageInput.trim()) {
            app?.actions.createMessage(messageInput)
            setMessageInput("")
          }
        }}
      />
      {messages?.map((message) => {
        return (
          <Text key={message.id} style={{ fontWeight: "bold" }}>
            {message.address?.slice(0, 8)}: {message.content}
          </Text>
        )
      })}
    </View>
  )
}
