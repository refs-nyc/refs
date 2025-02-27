import { useRef } from 'react'
import { useSharedValue } from 'react-native-reanimated'
import { DetailsDemoCarousel, renderItem } from '../profiles/Details'
import { View, Dimensions } from 'react-native'

const win = Dimensions.get('window')

export const DetailsDemo = () => {
  const ref = useRef(null)
  const scrollOffsetValue = useSharedValue(0)
  const items = [
    {
      image: true,
      expand: {
        ref: {
          title: 'Afrofuturism',
          image: require('@/assets/images/sample/Carousel-1.png'),
        },
      },
      text: 'pathways to unknown worlds etc etc',
    },
    {
      image: true,
      expand: {
        ref: {
          title: 'Tennis',
          image: require('@/assets/images/sample/Carousel-0.jpg'),
        },
      },
      text: 'Looking for an early bird who will trade off sign up at the Fort Greene courts',
    },
    {
      image: true,
      expand: {
        ref: {
          title: 'Poetic Computation',
          image: require('@/assets/images/sample/Carousel-2.png'),
        },
      },
      text: 'A website can be a poem, a poem can be a website',
    },
  ]

  return (
    <View
      pointerEvents="none"
      style={{
        width: win.width,
        height: win.width,
        overflow: 'hidden',
        left: 0,
      }}
    >
      <DetailsDemoCarousel
        data={items}
        renderItem={({ item }) => renderItem({ item, canAdd: false })}
        height={800}
        width={win.width}
        style={{ overflow: 'visible' }}
        ref={ref}
        defaultIndex={1}
        scrollOffsetValue={scrollOffsetValue}
        onSnapToItem={() => {}}
      />
    </View>
  )
}
