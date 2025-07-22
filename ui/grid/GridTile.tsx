import { TouchableOpacity, Dimensions } from 'react-native'
import { base, c, s } from '@/features/style'
import { useUIStore } from '@/ui/state'

const dimensions = Dimensions.get('window')
export const DEFAULT_TILE_SIZE = (dimensions.width - s.$09 * 2 - s.$075) / 3

export const GridTile = ({
  children,
  borderColor,
  borderWidth,
  backgroundColor,
  flex,
  size = DEFAULT_TILE_SIZE,
  activeOpacity,
}: {
  children?: React.ReactNode
  borderColor?: string
  borderWidth?: number
  backgroundColor?: string
  flex?: boolean
  size?: number
  activeOpacity?: number
}) => {
  const { stopEditProfile } = useUIStore()

  const placeholderStyle = {
    backgroundColor: backgroundColor || c.surface2,
    width: size,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

  return (
    <TouchableOpacity
      onPress={stopEditProfile}
      activeOpacity={activeOpacity !== undefined ? activeOpacity : 0.2}
      style={[
        base.gridTile,
        {
          borderWidth: borderWidth !== undefined ? borderWidth : 2,
          borderColor: borderColor || c.surface2,
          backgroundColor: backgroundColor || c.surface2,
          width: flex ? size : '100%',
        },
      ]}
    >
      {children}
    </TouchableOpacity>
  )
}
