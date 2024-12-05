import { forwardRef } from 'react'
import { Pressable } from 'react-native'
import { View, Text, styled } from 'tamagui'

const GridTileActionAddBase = forwardRef(({ onAddPress }: { onAddPress: () => void }, ref) => (
  <Pressable
    ref={ref}
    style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }}
    onPress={onAddPress}
  >
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
))

GridTileActionAddBase.displayName = 'GridTileActionAdd'

export const GridTileActionAdd = styled(GridTileActionAddBase, {
  name: 'GridTileActionAdd',
})
