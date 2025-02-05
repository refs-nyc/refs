import { XStack } from '../core/Stacks'
import { View, Text } from 'react-native'
import { useState, useEffect } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { pocketbase } from '@/features/pocketbase'
import { s, c } from '@/features/style'
import type { CompleteRef } from '@/features/pocketbase/stores/types'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'

export const RefListItem = ({
  r,
  backgroundColor,
}: {
  r: CompleteRef
  backgroundColor?: string
}) => {
  let [count, setCount] = useState(-1)

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
        // marginVertical: s.$1half,
        paddingVertical: s.$08,
        paddingHorizontal: s.$08,
        borderRadius: s.$075,
        backgroundColor: backgroundColor || c.surface,
      }}
    >
      <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {r?.image ? (
            <SimplePinataImage
              originalSource={r.image}
              imageOptions={{ width: s.$2, height: s.$2 }}
              style={{
                width: s.$2,
                height: s.$2,
                backgroundColor: c.accent,
                borderRadius: s.$075,
              }}
            />
          ) : (
            <View
              style={{
                width: s.$2,
                height: s.$2,
                backgroundColor: c.accent,
                borderRadius: s.$075,
              }}
            ></View>
          )}
          <Text>{r?.title}</Text>
        </XStack>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>{count === 1 ? 'You are' : count} referencing</Text>
          {/* <Ionicons name="close" /> */}
        </XStack>
      </XStack>
    </View>
  )
}
