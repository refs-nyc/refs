import { s, c } from '@/features/style'
import { useEffect, useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { pocketbase } from '../pocketbase'
import { useUIStore } from '@/ui/state'
import { RefsRecord } from '../pocketbase/stores/pocketbase-types'

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

export const Ticker = () => {
  const [tickerItems, setTickerItems] = useState<RefsRecord[]>([])
  const { addRefSheetRef, setAddingRefId, referencersBottomSheetRef, setCurrentRefId } =
    useUIStore()

  useEffect(() => {
    async function fetchTickerItems() {
      const queryResponse = await pocketbase.collection('refs').getFullList<RefsRecord>({
        filter: 'showInTicker=true',
        sort: '-created',
      })
      setTickerItems(queryResponse)
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
        {tickerItems.map((ref, index) => (
          <TouchableOpacity
            onPress={() => {
              // open a dialog for adding this ref to your profile
              setAddingRefId(ref.id)
              addRefSheetRef.current?.expand()
            }}
            onLongPress={() => {
              setCurrentRefId(ref.id)
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
            <Text style={{ fontSize: s.$09, color: c.olive }}>{truncate(ref.title || '', 35)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}
