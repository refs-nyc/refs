import { View } from 'react-native'

export const GridTile = ({ children }: { children?: React.ReactNode }) => {
  console.log(children)

  return (
    <View
      bg="$color.surface-2"
      borderWidth="$1"
      borderColor="$color.surface-2"
      borderRadius="$4"
      style={{ aspectRatio: 1, justifyContent: 'center', flex: 1 }}
    >
      {children}
    </View>
  )
}
