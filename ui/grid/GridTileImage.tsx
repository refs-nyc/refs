import { View } from 'react-native'
import { s } from '@/features/style'
import { SearchLoadingSpinner } from '@/ui/atoms/SearchLoadingSpinner'
import { SimplePinataImage } from '@/ui/images/SimplePinataImage'
import { DEFAULT_TILE_SIZE } from './GridTile'

export const GridTileImage = ({ source, processing = false }: { source: string; processing?: boolean }) => {
  return (
    <View style={{ width: '100%', height: '100%' }}>
      <SimplePinataImage
        originalSource={source}
        imageOptions={{ width: DEFAULT_TILE_SIZE, height: DEFAULT_TILE_SIZE }}
        placeholderStyle={{ borderRadius: s.$075, width: '100%', height: '100%' }}
        style={{ borderRadius: s.$075, width: '100%', height: '100%' }}
        contentFit="cover"
        priority="low"
        transition={200}
        cachePolicy="memory-disk"
      />
      {processing && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SearchLoadingSpinner size={40} />
        </View>
      )}
    </View>
  )
}

GridTileImage.displayName = 'GridTileImage'
