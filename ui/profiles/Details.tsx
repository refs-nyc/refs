import { useRef } from 'react'
import type { Profile } from '@/features/pocketbase/stores/types'
import { View, Text, Dimensions } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

const win = Dimensions.get('window')

const renderItem = ({ item }) => (
  <View key={item.id} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>{item.title}</Text>
  </View>
)

export const Details = ({ profile, initialId = '' }: { profile: Profile; intialId: string }) => {
  const ref = useRef<ICarouselInstance>(null)

  const data = profile.expand.items

  console.log('slide to ', initialId)
  return (
    <Carousel
      loop={false}
      ref={ref}
      data={data}
      width={win.width}
      height={win.height}
      enabled={true}
      renderItem={renderItem}
    />
  )
}
