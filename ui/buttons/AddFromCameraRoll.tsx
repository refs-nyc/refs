import { Button, SizableText } from '@/ui'
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
    <Ionicons size={12} name={icon}></Ionicons>
    <SizableText size="$5">{title}</SizableText>
  </Button>
)
