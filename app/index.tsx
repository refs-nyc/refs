import { Button, Text, View, Image, StyleSheet, Platform, TextInput } from 'react-native'
import { useState } from 'react'

import { useCanvas, useLiveQuery } from '@canvas-js/hooks'
import type { Actions, DeriveModelTypes, ModelSchema } from '@canvas-js/core'
import { SIWESigner } from '@canvas-js/chain-ethereum'

// drizzle studio
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import * as SQLite from 'expo-sqlite'
const db = SQLite.openDatabaseSync(':memory:')

// magic
import { magic } from './shared'
import { Web3Provider } from '@ethersproject/providers'
import { ethers } from 'ethers'

const REFS_TOPIC = 'refsv2.refs.nyc'

export default function Index() {
  const [messageInput, setMessageInput] = useState('')
  const [emailInput, setEmailInput] = useState('')

  const [loginInProgress, setLoginInProgress] = useState(false)
  const [sessionSigner, setSessionSigner] = useState(null) // TODO: move this to a context provider?

  // drizzle studio
  useDrizzleStudio(db)

  // magic
  const logout = async () => {
    setLoginInProgress(true)
    try {
      await magic.user.logout()
      setSessionSigner(null)
    } finally {
      setLoginInProgress(false)
    }
  }
  const login = async () => {
    setLoginInProgress(true)
    try {
      const bearer = await magic.auth.loginWithEmailOTP({ email: emailInput })
      const metadata = await magic.user.getMetadata()

      if (!metadata.publicAddress)
        throw new Error('internal error: magic did not assign an address')

      const provider = new Web3Provider(magic.rpcProvider)
      const signer = provider.getSigner()
      const checksumAddress = ethers.getAddress(metadata.publicAddress) // checksum-capitalized eth address

      const sessionSigner = new SIWESigner({ signer })

      let sessionObject = await sessionSigner.getSession(REFS_TOPIC)
      if (!sessionObject) {
        sessionObject = await sessionSigner.newSession(REFS_TOPIC)
      }
      const session = sessionObject.payload

      setSessionSigner(sessionSigner)

      // TODO: clear login email

      console.log('login done', session)
    } catch (error) {
      console.error(error)
    } finally {
      setLoginInProgress(false)
    }
  }

  // canvas
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
    contract: { models, actions },
    topic: 'chat-example.canvas.xyz',
  })

  const messages = useLiveQuery<DeriveModelTypes<typeof models>['message']>(app, 'message', {
    orderBy: { timestamp: 'desc' },
  })

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>Engine: {global.isHermes ? 'Hermes' : 'JSC'}</Text>

      <TextInput
        style={{
          height: 40,
          width: 200,
          borderColor: 'gray',
          borderWidth: 1,
          padding: 10,
          marginVertical: 10,
        }}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(text) => setEmailInput(text)}
      />

      {loginInProgress ? (
        <Button title="Processing..." disabled />
      ) : sessionSigner ? (
        <Button title="Logout" onPress={logout} />
      ) : (
        <Button title="Login" onPress={login} />
      )}

      <Text style={{ marginTop: 20 }}>Messages</Text>
      <TextInput
        style={{
          height: 40,
          width: 200,
          borderColor: 'gray',
          borderWidth: 1,
          padding: 10,
          marginVertical: 10,
        }}
        placeholder="Type a message..."
        value={messageInput}
        onChangeText={setMessageInput}
      />
      <Button
        title="Send"
        onPress={() => {
          if (messageInput.trim()) {
            app?.actions.createMessage(messageInput)
            setMessageInput('')
          }
        }}
      />
      {messages?.slice(0, 15).map((message) => {
        return (
          <Text key={message.id} style={{ fontWeight: 'bold' }}>
            {message.address?.slice(0, 8)}: {message.content}
          </Text>
        )
      })}
    </View>
  )
}
