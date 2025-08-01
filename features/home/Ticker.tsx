import { s, c } from '@/features/style'
import { useEffect, useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { CompleteRef } from '@/features/types'
import { useAppStore } from '@/features/stores'
import { pocketbase } from '@/features/pocketbase'

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

export const Ticker = () => {
  const [tickerItems, setTickerItems] = useState<CompleteRef[]>([])
  const { getTickerItems, referencersBottomSheetRef, setCurrentRefId, debugEdgeCityItems } = useAppStore()

  useEffect(() => {
    async function fetchTickerItems() {
      const queryResponse = await getTickerItems()
      setTickerItems(queryResponse)
      
      // Debug Edge City items
      await debugEdgeCityItems()
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
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: s.$075 * 0.9,
          padding: s.$075 * 0.9,
          marginTop: 3,
        }}
      >
        {tickerItems.map((ref, index) => (
          <TouchableOpacity
            onPress={async () => {
              console.log('Ticker: Clicked ref:', ref.title, 'with ID:', ref.id)
              if (ref.title === 'Edge City') {
                console.log('Ticker: Debugging Edge City...')
                try {
                  // Get all Edge City refs
                  const edgeCityRefs = await pocketbase.collection('refs').getFullList({
                    filter: 'title ~ "Edge City"',
                    sort: '-created',
                  })
                  console.log('Ticker: All Edge City refs:', edgeCityRefs.map(r => ({ id: r.id, title: r.title })))
                  
                  // Check items for each Edge City ref
                  for (const edgeRef of edgeCityRefs) {
                    const items = await pocketbase.collection('items').getFullList({
                      filter: `ref = "${edgeRef.id}"`,
                      expand: 'creator,ref',
                    })
                    console.log(`Ticker: Items for ref "${edgeRef.title}" (${edgeRef.id}):`, items.length)
                    if (items.length > 0) {
                      console.log(`Ticker: Items details:`, items.map(item => ({
                        id: item.id,
                        creator: item.expand?.creator?.userName || 'unknown',
                        ref: item.expand?.ref?.title || 'unknown'
                      })))
                    }
                  }
                } catch (error) {
                  console.log('Ticker: Error debugging Edge City:', error)
                }
              }
              setCurrentRefId(ref.id)
              referencersBottomSheetRef.current?.expand()
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
              borderRadius: s.$2 * 0.9,
              paddingHorizontal: s.$075 * 0.9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: s.$4 * 0.9,
            }}
          >
            <Text style={{ fontSize: s.$09 * 0.9, color: c.olive }}>
              {truncate(ref.title || '', 35)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}
