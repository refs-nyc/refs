import { useState } from 'react'
import { YStack } from '../core/Stacks'
import { TouchableOpacity, Pressable } from 'react-native'
import { base } from '@/features/style'
import { GridTileType } from '@/features/pocketbase/stores/types'
import { useUIStore } from '../state'
import { router, usePathname } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c } from '@/features/style'

export const GridTileWrapper = ({
  type,
  children,
  id,
  canEdit,
  index,
  onPress,
  onRemove,
}: {
  type: GridTileType
  children: React.ReactNode
  canEdit: boolean
  id?: string
  index?: number
  onPress?: () => void
  onRemove?: () => void
}) => {
  const pathname = usePathname()
  const { editingProfile, startEditProfile, stopEditProfile } = useUIStore()

  let timeout: ReturnType<typeof setTimeout>
  const [actions, setActions] = useState(false)

  const specificStyles = {
    borderWidth: type !== 'image' && type !== '' ? 2 : 0,
    borderColor: 'black',
  }

  const openDetailScreen = () => {
    if (pathname.includes('onboarding')) return
    stopEditProfile()
    const url = pathname === '/' ? '/modal' : `${pathname}/modal`
    const query = id ? `?initialId=${id}` : ''
    router.push(`${url}${query}`)
  }

  const handleLongPress = () => {
    if (canEdit) {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        stopEditProfile()
      }, 10000)
      startEditProfile()
    }
  }

  return (
    <TouchableOpacity
      onPress={openDetailScreen}
      onLongPress={handleLongPress}
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
