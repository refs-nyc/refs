import React from 'react'
import { YStack } from '../core/Stacks'
import { TouchableOpacity, Pressable, Text } from 'react-native'
import { base } from '@/features/style'
import { GridTileType } from '@/features/types'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c } from '@/features/style'
import { DEFAULT_TILE_SIZE } from './GridTile'

import { useAppStore } from '@/features/stores'

export const GridTileWrapper = ({
  type,
  children,
  id,
  onRemove,
  onPress,
  onLongPress,
  size = DEFAULT_TILE_SIZE,
  tileStyle,
}: {
  type: GridTileType
  children: React.ReactNode
  id?: string
  onRemove?: () => void
  onPress?: () => void
  onLongPress?: () => void
  size?: number
  tileStyle?: any
}) => {
  const { editingProfile, stopEditProfile } = useAppStore()

  const specificStyles = {
    borderWidth: type !== 'image' && type !== '' && type !== 'placeholder' ? 1.5 : 0,
    borderColor: '#333',
  }

  const placeholderStyles =
    type === 'placeholder'
      ? {
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.5)',
          borderStyle: 'dashed',
          borderDashArray: [4, 4],
          borderMiterLimit: 29,
        }
      : {}

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress && onPress()}
      onLongPress={onLongPress}
      style={[
        base.gridTile,
        type === 'placeholder' ? placeholderStyles : specificStyles,
        { width: size, justifyContent: 'center', alignItems: 'center', backgroundColor: c.surface },
        tileStyle,
      ]}
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
      {type === 'placeholder' ? (
        <Text style={{ color: c.muted, fontSize: 16, textAlign: 'center', paddingHorizontal: 10 }}>
          {children}
        </Text>
      ) : type === 'add' ? (
        React.cloneElement(children as React.ReactElement, { isPlaceholder: true })
      ) : (
        children
      )}
    </TouchableOpacity>
  )
}
