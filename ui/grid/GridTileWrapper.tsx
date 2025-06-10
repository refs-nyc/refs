import { YStack } from '../core/Stacks'
import { TouchableOpacity, Pressable } from 'react-native'
import { base } from '@/features/style'
import { GridTileType } from '@/features/pocketbase/stores/types'
import { useUIStore } from '../state'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c } from '@/features/style'

export const GridTileWrapper = ({
  type,
  children,
  id,
  onRemove,
  onPress,
  onLongPress,
}: {
  type: GridTileType
  children: React.ReactNode
  id?: string
  onRemove?: () => void
  onPress?: () => void
  onLongPress?: () => void
}) => {
  const { editingProfile, stopEditProfile } = useUIStore()

  const specificStyles = {
    borderWidth: type !== 'image' && type !== '' ? 1.5 : 0,
    borderColor: '#333',
  }

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress()}
      onLongPress={onLongPress}
      style={[base.gridTile, specificStyles]}
    >
      {editingProfile && type !== 'add' && id && (
        <YStack style={{ position: 'absolute', zIndex: 999, top: 0, right: 0 }}>
          <Pressable
            onPress={() => {
              stopEditProfile()
              onRemove && onRemove()
            }}
            style={{
              transform: 'translate(8px, -8px)',
              backgroundColor: c.grey1,
              borderRadius: 100,
            }}
          >
            <Ionicons size={12} style={{ padding: 6 }} name="close" />
          </Pressable>
        </YStack>
      )}
      {children}
    </TouchableOpacity>
  )
}
