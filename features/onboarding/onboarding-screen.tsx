import { OnboardingCarouselItem } from '@/ui'
import { View, Dimensions } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { useRef } from 'react'
import { router } from 'expo-router'
import Carousel, { ICarouselInstance, Pagination } from 'react-native-reanimated-carousel'
import { c, s } from '@/features/style'

export function OnboardingScreen() {
  const progress = useSharedValue<number>(0)
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [{}, {}, {}]

  const nextSlide = (index: number) => {
    ref.current?.next()
  }

  const done = () => {
    router.push('/user/register')
  }

  return (
    <View style={{ flex: 1 }}>
      <Carousel
        loop={false}
        ref={ref}
        data={data}
        onProgressChange={progress}
        width={win.width}
        height={win.height}
        enabled={true}
        renderItem={({ index }) => (
          <OnboardingCarouselItem index={index} next={() => nextSlide(index)} done={done}>
            <Pagination.Basic
              data={data}
              dotStyle={{ backgroundColor: c.grey1, borderRadius: 100 }}
              activeDotStyle={{ backgroundColor: c.grey2, borderRadius: 100 }}
              containerStyle={{
                gap: s.$2,
              }}
              progress={progress}
              horizontal
            />
          </OnboardingCarouselItem>
        )}
      />
    </View>
  )
}
