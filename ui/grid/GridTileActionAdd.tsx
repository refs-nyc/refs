import { Pressable } from 'react-native'
import { Heading } from '@/ui/typo/Heading'

export const GridTileActionAdd = ({ onPress }: { onPress: () => void }) => {
  return (
    <Pressable style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }} onPress={onPress}>
      <Heading tag="h1light" style={{ textAlign: 'center' }}>
        +
      </Heading>
    </Pressable>
  )
}
