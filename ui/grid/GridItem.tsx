import { Text } from 'react-native'
import { Pressable } from 'react-native'
import { GridTileWrapper } from './GridTileWrapper'
import { GridTileImage } from './GridTileImage'
import { Heading } from '../typo/Heading'
import { s } from '@/features/style'

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
  console.log(item.expand.ref)
  return (
    <>
      {item && (
        <>
          {item.expand.ref.image ? (
            <GridTileImage key={item.id} source={item.expand.ref.image} />
          ) : (
            <Text numberOfLines={3} style={{ textAlign: 'center', padding: s.$08 }}>
              {/* {item.list && 'L: '} */}
              {item.expand.ref.title}
            </Text>
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
