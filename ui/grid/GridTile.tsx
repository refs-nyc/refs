import { TouchableOpacity, Dimensions } from 'react-native'
import { base, c, s } from '@/features/style'
import { useUIStore } from '@/ui/state'

const dimensions = Dimensions.get('window')
export const DEFAULT_TILE_SIZE = (dimensions.width - s.$09 * 2 - s.$075) / 3

export const GridTile = ({
  children,
  borderColor,
  backgroundColor,
  flex,
  size = DEFAULT_TILE_SIZE,
  isPlaceholder = false,
}: {
  children?: React.ReactNode
  borderColor?: string
  backgroundColor?: string
  flex?: boolean
  size?: number
  isPlaceholder?: boolean
}) => {
  const { stopEditProfile } = useUIStore()

  const placeholderStyle = isPlaceholder
    ? {
        backgroundColor: backgroundColor || c.surface2,
        width: size,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      }
    : {
        borderWidth: 2,
        borderColor: borderColor || c.surface2,
        backgroundColor: backgroundColor || c.surface2,
        width: size,
      }

  return (
    <TouchableOpacity
      onPress={stopEditProfile}
      style={[base.gridTile, placeholderStyle]}
    >
      {children}
    </TouchableOpacity>
  )
}
