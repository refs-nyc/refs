import { XStack } from '../core/Stacks'
import { View, Text, Pressable } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c, base } from '@/features/style'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import type { CompleteRef, ExpandedItem } from '@/features/pocketbase/stores/types'

export const ListItem = ({
  r,
  backgroundColor,
  showMeta = true,
  withRemove = false,
  largeImage = false,
  onRemove,
  onTitlePress,
}: {
  r: CompleteRef | ExpandedItem
  backgroundColor?: string
  showMeta?: boolean
  withRemove?: boolean
  largeImage?: boolean
  onRemove?: () => void
  onTitlePress?: () => void
}) => {
  return (
    <View
      style={{
        paddingVertical: s.$08,
        paddingHorizontal: largeImage ? 0 : s.$08,
        borderRadius: s.$075,
        backgroundColor: backgroundColor || c.surface,
      }}
    >
      <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {(r as any)?.image || (r as any).expand?.ref?.image ? (
            <SimplePinataImage
              originalSource={(r as any).image || (r as any).expand?.ref?.image}
              imageOptions={{ width: largeImage ? s.$4 : s.$2, height: largeImage ? s.$4 : s.$2 }}
              style={largeImage ? base.largeSquare : base.smallSquare}
            />
          ) : (
            <View
              style={[
                largeImage ? base.largeSquare : base.smallSquare,
                { backgroundColor: c.accent },
              ]}
            ></View>
          )}
          <Pressable onPress={onTitlePress}>
            <Text style={{ color: c.muted, fontWeight: '700' }}>
              {(r as any)?.title || (r as any)?.expand?.ref?.title}
            </Text>
          </Pressable>
        </XStack>

        {withRemove && (
          <Pressable onPress={onRemove}>
            <Ionicons name="close" color={c.surface} />
          </Pressable>
        )}
      </XStack>
    </View>
  )
}
