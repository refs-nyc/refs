import { Text } from 'react-native'
import { Pressable } from 'react-native'
import { GridTileImage } from './GridTileImage'
import { GridTileType } from '@/features/pocketbase/stores/types'
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
  return (
    <>
      {item && (
        <>
          {item.list || !item?.expand?.ref?.image ? (
            <Text numberOfLines={3} style={{ textAlign: 'center', padding: s.$08 }}>
              {item?.expand?.ref?.title}
            </Text>
          ) : (
            <GridTileImage key={item.id} source={item.expand.ref.image} />
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
