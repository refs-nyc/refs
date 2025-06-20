import { s, c } from '@/features/style'
import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { pocketbase } from '../pocketbase'
import { ExpandedItem } from '../pocketbase/stores/types'

export const Ticker = () => {
  const [tickerItems, setTickerItems] = useState<{ title: string; itemId: string }[]>([])

  useEffect(() => {
    async function fetchTickerItems() {
      const queryResponse = await pocketbase.collection('items').getFullList<ExpandedItem>({
        filter: 'showInTicker=true',
        sort: '-created',
        expand: 'ref',
      })
      const result = queryResponse.map((item) => ({
        title: item.expand?.ref.title || '',
        itemId: item.id,
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
          <View
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
            }}
          >
            <Text style={{ fontSize: s.$09, color: c.olive }}>{item.title}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
