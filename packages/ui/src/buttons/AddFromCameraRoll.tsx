import { Button, SizableText } from 'tamagui'
import { getTokens } from '@tamagui/core'
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
  <Button
    onPress={onPress}
    borderColor="transparent"
    borderWidth="$1"
    borderRadius="$12"
    jc="flex-start"
    bg="white"
  >
    <Ionicons size={getTokens().size.$2.val} name={icon}></Ionicons>
    <SizableText size="$5">{title}</SizableText>
  </Button>
)
