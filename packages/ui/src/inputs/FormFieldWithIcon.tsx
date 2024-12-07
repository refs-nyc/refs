import { Button, Input, TextArea, XStack, YStack } from 'tamagui'
import { User, Phone, AtSign } from '@tamagui/lucide-icons'
import { getTokens } from "tamagui"
import { TextInput } from "react-native"

export const FormFieldWithIcon = ({
  type,
  id,
  placeholder,
  onChange,
}: {
  type: 'user' | 'phone' | 'email'
  id: string
  placeholder: string
  onChange: (str) => void
}) => {
  const { color } = getTokens()

  return (
  <XStack alignItems="center" p="$2" bg="$white" borderWidth={1.5} borderColor="$accent" borderRadius="$12" px="$4" gap="$4" width="100%">
    {type === 'user' && <User col="$accent" />}
    {type === 'phone' && <Phone col="$accent" />}
    {type === 'email' && <AtSign col="$accent" />}
    <TextInput style={{ flex: 1, paddingVertical: 10, color: color.$accent.val }} placeholder={placeholder} onChangeText={onChange} />
  </XStack>
)}
