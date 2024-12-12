import { View } from 'react-native'
import { base } from '@/features/style'

export const GridTile = ({ children }: { children?: React.ReactNode }) => {
  console.log(children)

  return (
    <View
      style={base.gridTile}
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
