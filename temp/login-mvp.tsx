import { Button, Text, View, TextInput } from 'react-native'
import { useState } from 'react'
import { useMagicContext } from '@/features/magic'

export default function Screen() {
  const [email, setEmail] = useState('')
  const { login, logout, loginState, LOGIN_STATE } = useMagicContext()

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
        onChangeText={setEmail}
      />

      <Text>
        {loginState}, {LOGIN_STATE.LOGGING_IN}
      </Text>

      {loginState === LOGIN_STATE.LOGGING_IN || loginState === LOGIN_STATE.LOGGING_OUT ? (
        <Button title="Processing..." disabled />
      ) : loginState === LOGIN_STATE.LOGGED_IN ? (
        <Button title="Logout" onPress={logout} />
      ) : (
        <Button title="Login" onPress={() => login(email)} />
      )}
    </View>
  )
}
