import { Text, View } from 'react-native'
import { Pressable } from 'react-native'
import { GridTileImage } from './GridTileImage'
import { GridTileType } from '@/features/types'
import { Heading } from '../typo/Heading'
import { s, c } from '@/features/style'
import { useAppStore } from '@/features/stores'

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
  const image = item.image || item.expand.ref?.image
  const { uploadingItems } = useAppStore()
  const processing = uploadingItems?.has?.(item.id)
  return (
    <>
      {item && (
        <>
          {item.list || !image ? (
            // No image: leave tile background visible, we still draw the bottom title card
            <View style={{ flex: 1 }} />
          ) : (
            <GridTileImage key={item.id} source={image} processing={!!processing} />
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

      {/* Bottom title card for all item tiles (excluding prompt/placeholder handled in wrapper) */}
      {item && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: c.surface2,
            borderBottomLeftRadius: s.$075,
            borderBottomRightRadius: s.$075,
            borderTopLeftRadius: s.$075,
            borderTopRightRadius: s.$075,
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ color: c.muted, fontSize: 14, textAlign: 'left', fontWeight: '500' }}
          >
            {item?.expand?.ref?.title || item?.title || ''}
          </Text>
        </View>
      )}
    </>
  )
}
