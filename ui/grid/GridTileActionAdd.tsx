import { Pressable, View } from 'react-native'
import { GridTile, Heading } from '@/ui'

export const GridTileActionAdd = ({ onAddPress }: { onAddPress: () => void }) => {
  const add = () => {
    onAddPress()
  }

  return (
    <Pressable style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }} onPress={add}>
      <GridTile borderColor="black">
        <Heading tag="h1normal" style={{ textAlign: 'center' }}>
          +
        </Heading>
      </GridTile>
    </Pressable>
  )
}
