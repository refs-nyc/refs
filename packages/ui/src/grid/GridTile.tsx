import { View } from 'tamagui'

export const GridTile = ({ children }: { children?: React.ReactNode }) => {
  return (
    <View
      bg="$color.surface-2"
      borderRadius="$4"
      style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }}
    >
      {children}
    </View>
  )
}
