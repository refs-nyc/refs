import { View } from 'react-native'
import { Image } from 'expo-image'

export const GridTileImage = ({ source }: { source: string }) => (
  <View
    style={{
      flex: 1,
      aspectRatio: 1,
      justifyContent: 'center',
      overflow: 'hidden',
    }}
  >
    <Image
      style={{
        flex: 1,
        width: '100%',
      }}
      source={source}
      contentFit="cover"
    />
  </View>
)
