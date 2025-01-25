import { SimplePinataImage } from '../images/SimplePinataImage'
import { View } from 'react-native'
import { s } from '@/features/style'

export const Avatar = ({ source, size = s.$3 }: { source: string; size: number }) => {
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
