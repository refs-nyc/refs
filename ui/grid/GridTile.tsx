import { View, TouchableOpacity } from 'react-native'
import { base, c, s } from '@/features/style'

export const GridTile = ({
  children,
  borderColor,
}: {
  children?: React.ReactNode
  borderColor?: string
}) => {
  const onLongPress = () => {
    console.log(children)
  }

  return (
    <View
      style={[base.gridTile, { borderWidth: 2, borderColor: borderColor || c.surface2 }]}
      onPress={onLongPress}
    >
      {children}
    </View>
  )
}
