import { XStack } from '../core/Stacks'
import { View, Text } from 'react-native'
import { useState, useEffect } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { pocketbase } from '@/features/canvas/stores'
import { s, c } from '@/features/style'

export const RefListItem = ({ r }: { r: CompleteRef }) => {
  let [referenceCount, setReferenceCount] = useState(-1)

  useEffect(() => {
    const getReferenceCount = async () => {
      const count = await pocketbase
        .collection('profiles')
        .getFullList({ filter: `items ~ "${r.id}"` })
      setReferenceCount(count.length)
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
        borderRadius: s.$075,
      }}
    >
      <XStack gap={s.$1} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$1} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: c.accent }}
          ></View>
          <Text>{r.title}</Text>
        </XStack>
        {}
        <XStack gap={s.$1} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>{referenceCount > -1 ? referenceCount : '...'} referencing</Text>
          <Ionicons name="close" />
        </XStack>
      </XStack>
    </View>
  )
}
