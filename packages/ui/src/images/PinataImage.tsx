// This component takes a local image uri, displays the image and meanwhile posts the image to Pinata
import { Image } from 'expo-image'
import { View } from 'tamagui'

export const PinataImage = ({ source }: { source: string }) => {
  return (
    <View width="100%" jc="center" ai="center">
      <View
        style={{ width: 200, height: 200, overflow: 'hidden' }}
        jc="center"
        ai="center"
        borderColor="$surface"
        borderWidth="$1"
        borderRadius={10}
      >
        <Image
          key={source}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
          source={source}
        />
      </View>
    </View>
  )
}
