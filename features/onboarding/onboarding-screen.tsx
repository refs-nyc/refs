import { OnboardingCarouselItem, YStack } from '@/ui'
import { View, Dimensions } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import { useRef } from 'react'
import { router } from 'expo-router'
import { Button } from '@/ui/buttons/Button'
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
          <YStack
            style={{
              height: '100%',
              paddingTop: s.$2,
              paddingBottom: s.$4,
            }}
          >
            <OnboardingCarouselItem index={index} />

            <View
              style={{
                height: 100,
                justifyContent: 'center',
              }}
            >
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
            </View>

            <View
              style={{
                paddingHorizontal: s.$2,
                width: '100%',
              }}
            >
              {index === data.length - 1 ? (
                <Button variant="raised" title={"I'm ready"} onPress={() => done()} />
              ) : (
                <Button variant="raised" title="Next" onPress={() => nextSlide(index)} />
              )}
            </View>
          </YStack>
        )}
      />
    </View>
  )
}
