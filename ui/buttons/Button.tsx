import { XStack, SizableText } from '@/ui'
import { Button } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

export const MainButton = ({ title, onPress }) => <Button title={title} onPress={onPress} />

export const SendButton = () => {
  return (
    <XStack
      width="$13"
      height="$5"
      borderRadius="$10"
      bg="$accent"
      gap="$3"
      ai="center"
      jc="center"
    >
      <SizableText color="$white" size="$4">
        Message
      </SizableText>
      <Ionicons color="white" name="send-outline" size="$1.5" />
    </XStack>
  )
}
