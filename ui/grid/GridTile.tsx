import { View, TouchableOpacity } from 'react-native'
import { base, c, s } from '@/features/style'
import { useUIStore } from '@/ui/state'

export const GridTile = ({
  children,
  borderColor,
  backgroundColor,
  flex,
}: {
  children?: React.ReactNode
  borderColor?: string
  backgroundColor?: string
  flex?: boolean
}) => {
  const { stopEditProfile } = useUIStore()

  return (
    <TouchableOpacity
      onPress={stopEditProfile}
      style={[
        base.gridTile,
        {
          borderWidth: 2,
          borderColor: borderColor || c.surface2,
          backgroundColor: backgroundColor || c.surface2,
          width: flex ? base.gridTile.width : '100%',
        },
      ]}
    >
      {children}
    </TouchableOpacity>
  )
}
