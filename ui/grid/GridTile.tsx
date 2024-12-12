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

  return (
    <View
      style={[
        base.gridTile,
        {
          borderWidth: s.$025,
          backgroundColor: c.surface2,
          borderColor: borderColor || c.surface2,
          borderRadius: s.$075,
          aspectRatio: 1,
          justifyContent: 'center',
          flex: 1,
        },
      ]}
    >
      {children}
    </View>
  )
}
