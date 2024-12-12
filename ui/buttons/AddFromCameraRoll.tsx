import { Pressable } from 'react-native'
import { SizableText, XStack } from '@/ui'
import { Button } from '../buttons/Button'
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
      <Button iconBefore={'camera'}>{title}</Button>
      {/* <Ionicons size={12} name={icon}></Ionicons> */}
      {/* <SizableText size="$5">{title}</SizableText> */}
    </XStack>
  </Pressable>
)
