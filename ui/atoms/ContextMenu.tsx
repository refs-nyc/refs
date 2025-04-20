import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { View } from 'react-native'
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
    <Animated.View
      entering={FadeIn.duration(200).delay(100)}
      exiting={FadeOut.duration(200)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <XStack
        style={{ backgroundColor: c.surface, padding: s.$08, borderRadius: s.$10 }}
        gap={s.$09}
      >
        <Pressable style={{ backgroundColor: c.grey2, padding: s.$075, borderRadius: s.$10 }}>
          <Ionicons
            size={s.$1}
            style={{ transform: 'translateX(-1px)' }}
            name="paper-plane-outline"
            color={c.white}
          />
        </Pressable>
        <Pressable style={{ backgroundColor: c.grey2, padding: s.$075, borderRadius: s.$10 }}>
          <Ionicons size={s.$1} style={{ transform: '' }} name="share-outline" color={c.white} />
        </Pressable>
        <Pressable style={{ backgroundColor: c.grey2, padding: s.$075, borderRadius: s.$10 }}>
          <Ionicons size={s.$1} style={{ transform: '' }} name="link" color={c.white} />
        </Pressable>
        {editingRights && (
          <Pressable
            onPress={onEditPress}
            style={{ backgroundColor: c.accent, padding: s.$075, borderRadius: s.$10 }}
          >
            <Ionicons
              size={s.$1}
              style={{ transform: 'scale(0.8)' }}
              name="pencil"
              color={c.white}
            />
          </Pressable>
        )}
      </XStack>
    </Animated.View>
  )
}
