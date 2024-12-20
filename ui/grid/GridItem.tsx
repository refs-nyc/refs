import { Text } from 'react-native'
import { Pressable } from 'react-native'
import { GridTileWrapper } from './GridTileWrapper'
import { GridTileImage } from './GridTileImage'
import { Heading } from '../typo/Heading'

export const GridItem = ({
  item,
  type = '',
  onPress,
  i,
}: {
  item: any
  type?: GridTileType
  i: number
  onPress?: () => {}
}) => {
  return (
    <>
      {item && (
        <>
          {item.image ? (
            <GridTileImage key={item.id} source={item.image} />
          ) : (
            <Text style={{ textAlign: 'center' }}>{item.expand.ref.title}</Text>
          )}
        </>
      )}

      {type === 'add' && (
        <Pressable style={{ flex: 1, aspectRatio: 1, justifyContent: 'center' }} onPress={onPress}>
          <Heading tag="h1light" style={{ textAlign: 'center' }}>
            +
          </Heading>
        </Pressable>
      )}
    </>
  )
}
