import { useRef, forwardRef } from 'react'
import { useSharedValue } from 'react-native-reanimated'
import { View, Dimensions } from 'react-native'
import Carousel from 'react-native-reanimated-carousel'

export const DetailsDemoCarousel = forwardRef(
  (
    // @ts-ignore
    { data, height, width, defaultIndex, style, scrollOffsetValue, onSnapToItem, renderItem },
    ref
  ) => {
    console.log(style)
    return (
      <Carousel
        onConfigurePanGesture={(gesture) => {
          'worklet'
          gesture.activeOffsetX([-10, 10])
        }}
        loop={data.length > 1}
        ref={ref}
        data={data}
        width={width * 0.8}
        height={height} // hack
        defaultIndex={defaultIndex}
        style={style}
        defaultScrollOffsetValue={scrollOffsetValue}
        onSnapToItem={onSnapToItem}
        renderItem={() => {}}
        autoPlay={true}
        autoPlayInterval={2000}
      />
    )
  }
)

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
        height: win.width + 50,
        overflow: 'hidden',
        left: 0,
      }}
    >
      <DetailsDemoCarousel
        data={items}
        renderItem={({ item }: any) => renderItem({ item, editingRights: false })}
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
