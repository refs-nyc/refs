import { useRef, forwardRef, Ref } from 'react'
import { SharedValue, useSharedValue } from 'react-native-reanimated'
import { View, Dimensions, StyleProp, ViewStyle, Text } from 'react-native'
import Carousel, { CarouselRenderItem, ICarouselInstance } from 'react-native-reanimated-carousel'
import { Image } from 'expo-image'
import { s, c } from '@/features/style'

export const DetailsDemoCarousel = forwardRef(
  (
    {
      data,
      height,
      width,
      defaultIndex,
      style,
      scrollOffsetValue,
      onSnapToItem,
      renderItem,
    }: {
      data: unknown[]
      height: number
      width: number
      defaultIndex: number
      style: StyleProp<ViewStyle>
      scrollOffsetValue: SharedValue<number>
      onSnapToItem?: (index: number) => void
      renderItem: CarouselRenderItem<unknown>
    },
    ref
  ) => {
    const cardWidth = Math.round(((width as number) - 20) / 2)
    return (
      <Carousel
        onConfigurePanGesture={(gesture) => {
          'worklet'
          gesture.activeOffsetX([-10, 10])
        }}
        loop={data.length > 1}
        ref={ref as Ref<ICarouselInstance>}
        data={data}
        width={cardWidth}
        height={height}
        defaultIndex={defaultIndex}
        style={style}
        defaultScrollOffsetValue={scrollOffsetValue}
        onSnapToItem={onSnapToItem}
        renderItem={({ item, index }: any) => {
          const CARD_W = cardWidth
          const IMG = CARD_W - 50
          return (
            <View style={{ paddingVertical: 2, paddingHorizontal: 6, width: CARD_W }}>
              {item?.expand?.ref?.image ? (
                <Image
                  style={{ width: IMG, height: IMG, borderRadius: 12, marginBottom: 6 }}
                  source={item.expand.ref.image}
                  contentFit="cover"
                />
              ) : (
                <View style={{ width: IMG, height: IMG, borderRadius: 12, backgroundColor: '#ddd', marginBottom: 6 }} />
              )}
              <Text style={{ width: CARD_W, color: '#4A5A52', fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
                {item?.expand?.ref?.title || ''}
              </Text>
              <Text style={{ width: CARD_W - 16, color: '#9BA6A0', fontSize: 14, lineHeight: 18 }} numberOfLines={2}>
                {index === 1 ? 'early-bird signups at the Fort Greene courts' : item?.text || ''}
              </Text>
            </View>
          )
        }}
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
        renderItem={({ item }: any) => {
          return <></>
          // renderItem({ item, editingRights: false })
        }}
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
