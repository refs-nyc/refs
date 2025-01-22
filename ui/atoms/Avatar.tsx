import { SimplePinataImage } from '../images/SimplePinataImage'
import { View } from 'react-native'
import { s } from '@/features/style'

export const Avatar = ({ source, size = s.$3 }: { source: string; size: number }) => {
  console.log('AVATAR')
  return (
    <View style={{ width: size, height: size }}>
      <SimplePinataImage
        style={{ borderRadius: '100%' }}
        originalSource={source}
        imageOptions={{ width: size, height: size }}
      />
    </View>
  )
}
