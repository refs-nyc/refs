import { View } from 'react-native'
import { Image } from 'expo-image'
import { s } from '@/features/style'
import { SearchLoadingSpinner } from '@/ui/atoms/SearchLoadingSpinner'
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { useEffect } from 'react'

export const GridTileImage = ({ source, processing = false }: { source: string; processing?: boolean }) => {
  return (
    <View style={{ width: '100%', height: '100%' }}>
      <Image
        style={[{ borderRadius: s.$075, width: '100%', height: '100%' }]}
        source={source}
        contentFit="cover"
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
