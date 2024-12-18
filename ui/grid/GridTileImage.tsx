import { View } from 'react-native'
import { Image } from 'expo-image'
import { s } from '@/features/style'

export const GridTileImage = ({ source }: { source: string }) => (
  <Image
    style={{ borderRadius: s.$075, width: '100%', height: '100%' }}
    source={source}
    contentFit="cover"
  />
)
