import { useState, useEffect } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { XStack } from '@/ui'
import { View, Text } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c } from '@/features/style'
import { CompleteRef } from '@/features/pocketbase/stores/types'

export const SearchResultItem = ({ r }: { r: CompleteRef }) => {
  const [count, setCount] = useState<string | number>('...')

  useEffect(() => {
    const getCount = async () => {
      // Get reference count
      const results = await pocketbase
        .collection('items')
        .getFullList({ filter: `ref = "${r.id}"` })
      console.log(results)
      setCount(results.length)
    }

    getCount()
  }, [])
  return (
    <View
      style={{
        // marginVertical: s.$1half,
        paddingVertical: s.$08,
        paddingHorizontal: s.$08,
        borderRadius: s.$075,
      }}
    >
      <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: c.accent }}
          ></View>
          <Text>{r?.title}</Text>
        </XStack>
        <XStack gap={s.$09} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>{count} referencing</Text>
          {/* <Ionicons name="close" /> */}
        </XStack>
      </XStack>
    </View>
  )
}
