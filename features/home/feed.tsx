import type { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useState, useEffect } from 'react'
import { DismissKeyboard, Button } from '@/ui'
import { pocketbase } from '@/features/pocketbase'
import { useUserStore } from '@/features/pocketbase/stores/users'
import { View, ScrollView } from 'react-native'
import { s } from '@/features/style'
import { Nearby } from './nearby'
import SearchBottomSheet from '@/ui/actions/SearchBottomSheet'

export const Feed = () => {
  const [items, setItems] = useState<ExpandedItem[]>([])
  const { logout } = useUserStore()

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

            <View style={{ marginBottom: s.$2, alignItems: 'center' }}>
              <Button
                style={{ width: 20 }}
                variant="inlineSmallMuted"
                title="Log out"
                onPress={logout}
              />
            </View>
          </View>
        </ScrollView>
      </DismissKeyboard>
      <SearchBottomSheet />
    </>
  )
}
