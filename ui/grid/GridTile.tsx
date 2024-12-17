import { View } from 'react-native'
import { base, c, s } from '@/features/style'

export const GridTile = ({
  children,
  borderColor,
}: {
  children?: React.ReactNode
  borderColor?: string
}) => {
  console.log(children)

  return <View style={[base.gridTile, { borderColor: borderColor || c.surface2 }]}>{children}</View>
}
