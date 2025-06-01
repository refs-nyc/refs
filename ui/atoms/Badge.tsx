import { c, s } from '@/features/style'
import { View, Text } from 'react-native'

export function Badge({ count, color }: { count: number; color?: string }) {
  return (
    <View
      style={{
        backgroundColor: color || c.accent,
        borderRadius: 100,
        padding: 6,
        paddingTop: 4,
        paddingBottom: 4,
        position: 'absolute',
        top: -5,
        right: -10,
      }}
    >
      <Text style={{ fontWeight: 'bold', color: c.white, fontSize: 12 }}>{count}</Text>
    </View>
  )
}
