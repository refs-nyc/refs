import { Pressable, View } from 'react-native'
import { GridTile, Heading } from '@/ui'

export const GridTileActionAdd = ({ onAddPress }: { onAddPress: () => void }) => {
  const add = () => {
    console.log('add')
    onAddPress()
  }

  return (
    <GridTile borderColor="black">
      <Pressable style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }} onPress={add}>
        <Heading tag="h1light" style={{ textAlign: 'center' }}>
          +
        </Heading>
      </Pressable>
    </GridTile>
  )
}
