import { s, c } from '@/features/style'
import { ScrollView, Text, View } from 'react-native'

export const Ticker = () => {
  const tickerItems = [
    'Snoopy',
    'Funes, the Memorious',
    'Cherry MX Brown',
    'Natural Wine',
    'Frutiger Aero',
  ]

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
        {tickerItems.map((name, index) => (
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
            <Text style={{ fontSize: s.$09, color: c.olive }}>{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
