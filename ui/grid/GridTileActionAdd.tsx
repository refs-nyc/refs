import { Pressable, View, Text } from 'react-native'

export const GridTileActionAdd = ({ onAddPress }: { onAddPress: () => void }) => {
  const add = () => {
    onAddPress()
  }

  return (
    <Pressable
      ref={ref}
      style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }}
      onPress={add}
    >
      <View
        style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }}
        borderColor="black"
        bg="$surface-2"
        borderWidth="$1"
        borderRadius="$4"
      >
        <Text fontFamily="$heading" fontSize="$8" style={{ textAlign: 'center' }}>
          +
        </Text>
      </View>
    </Pressable>
  )
}
