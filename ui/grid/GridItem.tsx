import { Text } from 'react-native'
import { TouchableOpacity, Pressable } from 'react-native'
import { GridTile } from './GridTile'
import { GridTileImage } from './GridTileImage'
import { useItemStore } from '@/features/canvas/stores'
import { base } from '@/features/style'
import { Heading } from '../typo/Heading'

export const GridItem = ({
  item,
  type = '',
  onPress,
  i,
}: {
  item: any
  type?: 'add' | 'image' | 'text' | ''
  i: number
  onPress?: () => {}
}) => {
  const specificStyles = {
    borderWidth: item?.image ? 0 : 2,
    borderColor: type !== 'image' ? 'black' : 'transparent',
  }

  return (
    <TouchableOpacity
      style={[
        base.gridTile,
        {
          overflow: 'hidden',
        },
        specificStyles,
      ]}
    >
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
    </TouchableOpacity>
  )
}
