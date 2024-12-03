import { Pressable } from 'react-native'
import { View, Text, styled } from 'tamagui'

export const GridTileActionAdd = styled(
  ({ onAddPress }: { onAddPress: () => void }) => (
      <Pressable style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }} onPress={onAddPress}>
        <View
          style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }}
          borderColor="black"
          borderWidth="$1"
          borderRadius="$4"
        >
          <Text fontFamily="$heading" fontSize="$8" style={{ textAlign: 'center' }}>
            +
          </Text>
        </View>
      </Pressable>
  ),
  {
    name: 'GridTileActionAdd',
    // variants: {
    //   blue: {
    //     true: {
    //       backgroundColor: 'blue',
    //     },
    //   },
    // } as const,
  }
)
