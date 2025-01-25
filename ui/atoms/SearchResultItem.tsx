import { useState, useEffect } from 'react'
import { pocketbase } from '@/features/pocketbase'
import { XStack } from '@/ui/core/Stacks'
import { View, Text } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { s, c } from '@/features/style'
import { CompleteRef } from '@/features/pocketbase/stores/types'
import { useUserStore } from '@/features/pocketbase/stores/users'

export const SearchResultItem = ({ r }: { r: CompleteRef }) => {
  const [count, setCount] = useState<string | number>('...')
  const { profileItems, backlogItems } = useUserStore()

  useEffect(() => {
    console.log('BACKLOG', backlogItems.length)
    console.log(backlogItems.map((itm) => itm.expand.ref.id))
    console.log(backlogItems.map((itm) => Object.keys(itm)))
    console.log(r.id)
  }, [backlogItems])

  useEffect(() => {
    const getCount = async () => {
      // Get reference count
      const results = await pocketbase
        .collection('items')
        .getFullList({ filter: `ref = "${r.id}"` })

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
          {profileItems.map((itm) => itm.expand.ref.id).includes(r.id) && (
            <Text>You are referencing</Text>
          )}
          {backlogItems.map((itm) => itm.expand.ref.id).includes(r.id) && (
            <Text>In your backlog</Text>
          )}
          {![...backlogItems, ...profileItems].map((itm) => itm.expand.ref.id).includes(r.id) && (
            <Text>{count} referencing</Text>
          )}
        </XStack>
      </XStack>
    </View>
  )
}
