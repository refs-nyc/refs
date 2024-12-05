import { forwardRef } from 'react'
import { Pressable } from 'react-native'
import { View, Text, styled } from 'tamagui'

const GridTileActionAddBase = forwardRef(({ onAddPress }: { onAddPress: () => void }, ref) => {
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
})

GridTileActionAddBase.displayName = 'GridTileActionAdd'

export const GridTileActionAdd = styled(GridTileActionAddBase, {
  name: 'GridTileActionAdd',
})
