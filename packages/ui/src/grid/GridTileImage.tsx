import { View, Text, styled } from 'tamagui'
import { Image } from 'expo-image'

export const GridTileImage = styled(
  ({ source }: { source: string }) => (
    <View
      style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }}
      borderRadius="$4"
      overflow="hidden"
    >
      {/* <Text>{source}</Text> */}
      <Image
        style={{
          flex: 1,
          width: '100%',
          backgroundColor: '#0553',
        }}
        source={source}
        contentFit="cover"
      />
    </View>
  ),
  {
    name: 'GridTileImage',
    // variants: {
    //   blue: {
    //     true: {
    //       backgroundColor: 'blue',
    //     },
    //   },
    // } as const,
  }
)
