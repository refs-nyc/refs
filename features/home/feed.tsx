import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useState, useEffect } from 'react'
import { DismissKeyboard } from '@/ui'
import { pocketbase } from '@/features/pocketbase'
import { View, ScrollView } from 'react-native'
import { Nearby } from './nearby'
import SearchBottomSheet from '@/ui/actions/SearchBottomSheet'

export const Feed = () => {
  const [items, setItems] = useState<ExpandedItem[]>([])

  useEffect(() => {
    const getInitialData = async () => {
      try {
        const records = await pocketbase.collection('items').getList<ExpandedItem>(1, 30, {
          // TODO: remove list = false once we have a way to display lists in the feed
          // also consider showing backlog items in the feed, when we have a way to link to them
          filter: `creator != null && backlog = false && list = false`,
          sort: '-created',
          expand: 'ref,creator',
        })

        setItems(records.items)
      } catch (error) {
        console.error(error)
      }
    }

    getInitialData()
  }, [])

  return (
    <>
      <DismissKeyboard>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ height: '100%' }}>
            <Nearby items={items} />
          </View>
        </ScrollView>
      </DismissKeyboard>
      <SearchBottomSheet />
    </>
  )
}
