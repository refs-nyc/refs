import { s, c } from '@/features/style'
import { useEffect, useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { pocketbase } from '../pocketbase'
import { ExpandedItem } from '../pocketbase/stores/types'
import { useUIStore } from '@/ui/state'

export const Ticker = () => {
  const [tickerItems, setTickerItems] = useState<{ title: string; refId: string }[]>([])
  const { addRefSheetRef, setAddingRefId, referencersBottomSheetRef, setCurrentRefId } =
    useUIStore()

  useEffect(() => {
    async function fetchTickerItems() {
      const queryResponse = await pocketbase.collection('items').getFullList<ExpandedItem>({
        filter: 'showInTicker=true',
        sort: '-created',
        expand: 'ref',
      })
      const result = queryResponse.map((item) => ({
        title: item.expand?.ref.title || '',
        refId: item.expand?.ref.id,
      }))
      setTickerItems(result)
    }
    fetchTickerItems()
  }, [])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        paddingBottom: s.$10,
        backgroundColor: c.surface,
        height: s.$15,
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', gap: s.$075, padding: s.$075 }}>
        {tickerItems.map((item, index) => (
          <TouchableOpacity
            onPress={() => {
              // open a dialog for adding this ref to your profile
              setAddingRefId(item.refId)
              addRefSheetRef.current?.expand()
            }}
            onLongPress={() => {
              setCurrentRefId(item.refId)
              referencersBottomSheetRef.current?.expand()
            }}
            key={index}
            style={{
              backgroundColor: c.surface,
              borderWidth: 2,
              borderColor: c.olive,
              borderRadius: s.$2,
              paddingHorizontal: s.$075,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: s.$4,
            }}
          >
            <Text style={{ fontSize: s.$09, color: c.olive }}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}
