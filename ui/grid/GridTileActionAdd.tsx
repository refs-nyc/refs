import { Pressable } from 'react-native'
import { Heading } from '@/ui/typo/Heading'

export const GridTileActionAdd = ({ onPress }: { onPress: () => void }) => {
  const add = () => {
    console.log('add')
    onPress()
  }

  return (
    <Pressable style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }} onPress={add}>
      <Heading tag="h1light" style={{ textAlign: 'center' }}>
        +
      </Heading>
    </Pressable>
  )
}
