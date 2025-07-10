import { magic } from '@/features/magic'
import { Button } from '@/ui'
import { useCallback, useState } from 'react'
import { TextInput, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export default function Screen() {
  return (
    <SafeAreaProvider>
      <MagicLogin />
      <magic.Relayer />
    </SafeAreaProvider>
  )
}

const MagicLogin = () => {
  const [phoneNumber, setPhoneNumber] = useState<string>('')

  const handleLogin = useCallback(async () => {
    const did = await magic.auth.loginWithSMS({ phoneNumber })
    console.log(`did: ${did}, phoneNumber: ${phoneNumber}`)
  }, [phoneNumber])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <TextInput
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Enter phone number"
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  )
}
