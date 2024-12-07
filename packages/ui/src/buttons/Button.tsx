import { Button, XStack, SizableText, styled } from 'tamagui'
import { Pressable } from 'react-native'
import { Send } from '@tamagui/lucide-icons'

export const MainButton = styled(Button, {
  name: 'MainButton',
  backgroundColor: '$color.accent',
  color: '$color.white',
  borderRadius: '$8',

  variants: {
    secondary: {
      true: {
        backgroundColor: '$color.surface-2',
        color: '$color.black',
      },
    },
  } as const,
})

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
      <Send color="$white" size="$1.5" />
    </XStack>
  )
}
