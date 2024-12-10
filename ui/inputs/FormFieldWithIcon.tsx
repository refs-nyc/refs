import { XStack } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'
import { TextInput } from 'react-native'

export const FormFieldWithIcon = ({
  type,
  id,
  placeholder,
  onChange,
  value = '',
}: {
  type: 'user' | 'phone' | 'email'
  id: string
  placeholder: string
  onChange: (str) => void
  value: string
}) => {
  // const { color } = getTokens()

  return (
    <XStack
      alignItems="center"
      p="$2"
      bg="$white"
      borderWidth={1.5}
      borderColor="$accent"
      borderRadius="$12"
      px="$4"
      gap="$4"
      width="100%"
    >
      {type === 'user' && <Ionicons name="person" col="$accent" />}
      {type === 'phone' && <Ionicons name="call" col="$accent" />}
      {type === 'email' && <Ionicons name="at" col="$accent" />}
      <TextInput
        style={{ flex: 1, paddingVertical: 10, color: 'red' }}
        placeholder={placeholder}
        onChangeText={onChange}
        value={value}
      />
    </XStack>
  )
}
