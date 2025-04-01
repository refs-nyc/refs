import { Ionicons } from '@expo/vector-icons'
import { Pressable } from 'react-native'
import { XStack } from '../core/Stacks'
import { s, c } from '@/features/style'

export const ContextMenu = ({
  editingRights = false,
  onEditPress = () => {},
}: {
  editingRights?: boolean
  onEditPress: () => void
}) => {
  return (
    <XStack style={{ backgroundColor: c.surface, padding: s.$08, borderRadius: s.$10 }} gap={s.$09}>
      <Pressable style={{ backgroundColor: '#B6B5B2', padding: s.$075, borderRadius: s.$10 }}>
        <Ionicons
          size={s.$1}
          style={{ transform: 'translateX(-1px)' }}
          name="paper-plane-outline"
          color={c.white}
        />
      </Pressable>
      <Pressable style={{ backgroundColor: '#B6B5B2', padding: s.$075, borderRadius: s.$10 }}>
        <Ionicons size={s.$1} style={{ transform: '' }} name="share-outline" color={c.white} />
      </Pressable>
      <Pressable style={{ backgroundColor: '#B6B5B2', padding: s.$075, borderRadius: s.$10 }}>
        <Ionicons size={s.$1} style={{ transform: '' }} name="link" color={c.white} />
      </Pressable>
      {editingRights && (
        <Pressable
          onPress={onEditPress}
          style={{ backgroundColor: '#B6B5B2', padding: s.$075, borderRadius: s.$10 }}
        >
          <Ionicons size={s.$1} style={{ transform: 'scale(0.8)' }} name="pencil" color={c.white} />
        </Pressable>
      )}
    </XStack>
  )
}
