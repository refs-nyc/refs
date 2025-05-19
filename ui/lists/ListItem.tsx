import { XStack } from '../core/Stacks'
import { View, Text, Pressable } from 'react-native'
import { useState, useEffect } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { pocketbase } from '@/features/pocketbase'
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
}: {
  r: CompleteRef | ExpandedItem
  backgroundColor?: string
  showMeta?: boolean
  withRemove?: boolean
  largeImage?: boolean
  onRemove?: () => void
}) => {
  let [count, setCount] = useState(-1)

  console.log('WITH REMOVE', withRemove)
  console.log('WITH large image', largeImage)

  useEffect(() => {
    const getReferenceCount = async () => {
      const count = await pocketbase
        .collection('users')
        .getFullList({ filter: `items ~ "${r.id}"` })
      setCount(count.length)
    }
    try {
      getReferenceCount()
    } catch (error) {
      console.error(error)
    }
  })

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
          {r?.image ? (
            <SimplePinataImage
              originalSource={r.image || r.expand?.ref?.image}
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
          <Text>{r?.title || r?.expand?.ref?.title}</Text>
        </XStack>

        {withRemove ? (
          <Pressable onPress={onRemove}>
            <Ionicons name="close" />
          </Pressable>
        ) : (
          showMeta && (
            <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>{count === 1 ? 'You are' : count} referencing</Text>
            </XStack>
          )
        )}
      </XStack>
    </View>
  )
}
