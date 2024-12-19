import { TouchableOpacity } from 'react-native'
import { base } from '@/features/style'

export const GridTileWrapper = ({
  type,
  children,
}: {
  type: GridTileType
  children: React.ReactNode
}) => {
  const specificStyles = {
    borderWidth: type === 'image' ? 0 : 2,
    borderColor: type !== 'image' ? 'black' : 'transparent',
  }

  return (
    <TouchableOpacity
      style={[
        base.gridTile,
        {
          overflow: 'hidden',
        },
        specificStyles,
      ]}
    >
      {children}
    </TouchableOpacity>
  )
}
