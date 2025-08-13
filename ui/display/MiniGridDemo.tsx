import React from 'react'
import { View, Dimensions, Text } from 'react-native'
import { Image } from 'expo-image'
import { s, c } from '@/features/style'

type GridItem = { source: any; title?: string }

const win = Dimensions.get('window')

export const MiniGridDemo = ({ items }: { items?: GridItem[] }) => {
  const gap = 6
  const containerHeight = win.width * 0.6
  const columns = 3
  const rows = 3
  const sidePadding = 10
  const gridWidth = win.width - sidePadding * 2
  const baseTile = Math.floor((gridWidth - gap * (columns - 1)) / columns)
  const scaleFactor = 0.5
  const tileSize = Math.floor(baseTile * scaleFactor)
  const gridInnerWidth = tileSize * columns + gap * (columns - 1)

  const demoItems: GridItem[] =
    items && items.length > 0
      ? items
      : [
          { source: require('@/assets/images/sample/Carousel-0.jpg'), title: 'big pancake' },
          { source: require('@/assets/images/sample/Carousel-1.png'), title: 'Fantastic Planet' },
          { source: require('@/assets/images/sample/Carousel-2.png'), title: '' },
          { source: require('@/assets/images/sample/Carousel-1.png'), title: 'Science, Order, and Creativity' },
          { source: require('@/assets/images/sample/Carousel-0.jpg'), title: 'NTS' },
          { source: require('@/assets/images/sample/Carousel-2.png'), title: '' },
          { source: require('@/assets/images/sample/Carousel-0.jpg'), title: '' },
          { source: require('@/assets/images/sample/Carousel-1.png'), title: '' },
        ]

  return (
    <View pointerEvents="none" style={{ height: containerHeight, overflow: 'hidden', alignItems: 'center', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: gridInnerWidth, gap }}>
        {demoItems.slice(0, rows * columns - 1).map((it, i) => (
          <View key={i} style={{ width: tileSize, height: tileSize, borderRadius: s.$075, overflow: 'hidden' }}>
            <Image style={{ width: '100%', height: '100%' }} contentFit="cover" source={it.source} />
          </View>
        ))}
        {/* Prompt-style + tile (mimic real prompt tile) */}
        <View
          style={{
            width: tileSize,
            height: tileSize,
            borderRadius: s.$075,
            backgroundColor: c.surface,
            borderWidth: 2,
            borderColor: '#B0B0B0',
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#B0B0B0', fontSize: 24, fontWeight: '600' }}>+</Text>
        </View>
      </View>
    </View>
  )
}

