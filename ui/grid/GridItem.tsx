import { Text, View } from 'react-native'
import { Pressable } from 'react-native'
import { GridTileImage } from './GridTileImage'
import { GridTileType } from '@/features/types'
import { Heading } from '../typo/Heading'
import { s, c } from '@/features/style'
import { useAppStore } from '@/features/stores'
import { useMemo } from 'react'

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
  const image = useMemo(() => {
    // Prioritize direct image property, fallback to expand.ref.image
    return item.image || item.expand?.ref?.image || null
  }, [item.image, item.expand?.ref?.image])
  
  // Only subscribe to uploadingItems to prevent unnecessary re-renders
  const uploadingItems = useAppStore(state => state.uploadingItems)
  const processing = uploadingItems?.has?.(item.id)

  // Community prompt-like flag
  const isCommunityPrompt = !image && (item.__promptKind === 'interest' || item.__promptKind === 'event')
  const promptColor = item.__promptKind === 'event' ? c.olive : '#B0B0B0'

  return (
    <>
      {item && (
        <>
          {item.list || !image ? (
            isCommunityPrompt ? (
              <View style={{ flex: 1 }} />
            ) : (
              <View style={{ flex: 1 }} />
            )
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

      {/* Bottom title card for classic image tiles */}
      {item && !isCommunityPrompt && (
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

      {/* Prompt-like text overlay for community interest/event (no image) */}
      {item && isCommunityPrompt && (
        <View style={{ position: 'absolute', left: 8, right: 8, top: 8, bottom: 8, justifyContent: 'center' }}>
          <Text style={{ color: promptColor, fontSize: 14, textAlign: 'center', fontWeight: '500' }} numberOfLines={6}>
            {item?.expand?.ref?.title || item?.title || ''}
          </Text>
        </View>
      )}
    </>
  )
}

GridItem.displayName = 'GridItem'
