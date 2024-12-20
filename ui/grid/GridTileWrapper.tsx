import { useState } from 'react'
import { YStack } from '../core/Stacks'
import { TouchableOpacity, Pressable } from 'react-native'
import { base } from '@/features/style'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c } from '@/features/style'

export const GridTileWrapper = ({
  type,
  children,
  onRemove,
}: {
  type: GridTileType
  children: React.ReactNode
  onRemove?: () => void
}) => {
  let timeout: ReturnType<typeof setTimeout>
  const [actions, setActions] = useState(false)
  const specificStyles = {
    borderWidth: type === 'image' ? 0 : 2,
    borderColor: type !== 'image' && type !== '' ? 'black' : 'transparent',
  }

  const showActions = () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      setActions(false)
    }, 10000)
    setActions(true)
  }

  return (
    <TouchableOpacity onLongPress={showActions} style={[base.gridTile, specificStyles]}>
      {actions && type !== 'add' && (
        <YStack style={{ position: 'absolute', zIndex: 999, top: 0, right: 0 }}>
          <Pressable
            onPress={() => {
              setActions(false)
              onRemove()
            }}
            style={{
              transform: 'translate(8px, -8px)',
              backgroundColor: c.grey1,
              borderRadius: '100%',
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
