import { View } from 'react-native'
import { Image } from 'expo-image'
import { base } from '@/features/style'

export const GridTileImage = ({ source }: { source: string }) => (
  <Image
    style={[base.gridTile, { borderColor: 'transparent' }]}
    source={source}
    contentFit="cover"
  />
)
