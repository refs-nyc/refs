import { SimplePinataImage } from '../images/SimplePinataImage'
import { View } from 'react-native'
import { c, s } from '@/features/style'
import { Ionicons } from '@expo/vector-icons';

export const Avatar = ({ source, size = s.$3 }: { source: string | undefined; size: number }) => {
  if (!source) return (
    <View style={{ width: size, height: size }}>
      <Ionicons name="person" size={size} color={c.accent} />
    </View>
  )
  return (
    <>
      <View style={{ width: size, height: size }}>
        <SimplePinataImage
          style={{ width: '100%', height: '100%', borderRadius: size / 2, backgroundColor: "#ddd" }}
          originalSource={source}
          imageOptions={{ width: size * 2, height: size * 2 }}
        />
      </View>
    </>
  )
}
