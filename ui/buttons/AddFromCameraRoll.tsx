import { Pressable } from 'react-native'
import { SizableText, XStack } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'

export const AddFromCameraRoll = ({
  title,
  icon,
  onPress,
}: {
  title: string
  icon: string
  onPress: () => void
}) => (
  <Pressable
    onPress={onPress}
    borderColor="transparent"
    borderWidth="$1"
    borderRadius="$12"
    jc="flex-start"
    bg="white"
  >
    <XStack>
      <Ionicons size={12} name={icon}></Ionicons>
      <SizableText size="$5">{title}</SizableText>
    </XStack>
  </Pressable>
)
