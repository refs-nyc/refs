import { OnboardingCarouselItem } from '@/ui'
import { View, Dimensions } from 'react-native'
import { useRef } from 'react'
import { router } from 'expo-router'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

export function OnboardingScreen() {
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [{}, {}, {}]

  const nextSlide = (index: number) => {
    ref.current?.next()
  }

  const done = () => {
    router.push('/user/new')
  }

  return (
    <View style={{ flex: 1 }}>
      <Carousel
        loop={false}
        ref={ref}
        data={data}
        width={win.width}
        height={win.height}
        enabled={true}
        renderItem={({ index }) => (
          <OnboardingCarouselItem index={index} next={() => nextSlide(index)} done={done} />
        )}
      />
    </View>
  )
}
