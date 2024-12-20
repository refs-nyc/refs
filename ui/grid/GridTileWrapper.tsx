import { useState } from 'react'
import { YStack } from '../core/Stacks'
import { TouchableOpacity, Pressable } from 'react-native'
import { base } from '@/features/style'
import { router, usePathname } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c } from '@/features/style'

export const GridTileWrapper = ({
  type,
  children,
  id,
  onRemove,
}: {
  type: GridTileType
  children: React.ReactNode
  id?: string
  onRemove?: () => void
}) => {
  const pathname = usePathname()

  let timeout: ReturnType<typeof setTimeout>
  const [actions, setActions] = useState(false)

  const specificStyles = {
    borderWidth: type === 'image' ? 0 : 2,
    borderColor: type !== 'image' && type !== '' ? 'black' : 'transparent',
  }

  const openDetailScreen = () => {
    router.replace(`${pathname}/details${id && `?initialId=${id}`}`)
  }

  const showActions = () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      setActions(false)
    }, 10000)
    setActions(true)
  }

  return (
    <TouchableOpacity
      onPress={openDetailScreen}
      onLongPress={showActions}
      style={[base.gridTile, specificStyles]}
    >
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
