import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from 'react-native'
import { XStack } from '../core/Stacks'
import { s, c } from '@/features/style'

export const ContextMenu = ({
  editingRights = false,
  onEditPress = () => {},
  onSharePress = () => {},
  onCopyLinkPress = () => {},
  onViewSourcePress = () => {},
  showViewSource = false,
}: {
  editingRights?: boolean
  onEditPress: () => void
  onSharePress: () => void
  onCopyLinkPress: () => void
  onViewSourcePress?: () => void
  showViewSource?: boolean
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
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: 12,
          borderRadius: 50,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 8,
        }}
        gap={10}
      >
        <Pressable
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 50,
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={onSharePress}
        >
          <Ionicons size={24} name="share-outline" color={c.white} />
        </Pressable>
        <Pressable
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 50,
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={onCopyLinkPress}
        >
          <Ionicons size={24} name="link" color={c.white} />
        </Pressable>
        {showViewSource && (
          <Pressable
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 50,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={onViewSourcePress}
          >
            <Ionicons size={24} name="open-outline" color={c.white} />
          </Pressable>
        )}
        {editingRights && (
          <Pressable
            onPress={onEditPress}
            style={{
              backgroundColor: c.accent,
              borderRadius: 50,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons size={24} name="pencil" color={c.white} />
          </Pressable>
        )}
      </XStack>
    </Animated.View>
  )
}
