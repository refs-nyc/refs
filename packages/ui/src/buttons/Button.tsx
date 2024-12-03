import { Button, styled } from 'tamagui'

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
