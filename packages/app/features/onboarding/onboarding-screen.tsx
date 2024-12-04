import { Button, Paragraph, YStack, OnboardingCarouselItem, Drawer } from '@my/ui'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { Dimensions } from 'react-native'
import { useRef, useState } from 'react'
import { useSharedValue } from 'react-native-reanimated'
import { View, Text } from 'tamagui'
import { useRouter } from 'solito/navigation'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useCanvasContext } from 'app/features/canvas/contract'

export function OnboardingScreen() {
  const ref = useRef<ICarouselInstance>(null)
  const router = useRouter()
  const progress = useSharedValue<number>(0)
  const win = Dimensions.get('window')
  const data = [{}, {}, {}, {}, {}]

  const app = useCanvasContext()

  console.log(app.actions)

  const [showDrawer, setShowDrawer] = useState(false)

  const nextSlide = (index: number) => {
    ref.current?.scrollTo({
      /**
       * Calculate the difference between the current index and the target index
       * to ensure that the carousel scrolls to the nearest index
       */
      count: index + 1,
      animated: true,
    })
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
          <OnboardingCarouselItem
            index={index}
            next={() => nextSlide(index)}
            onAddItem={() => {
              console.log('on add item')
              setShowDrawer(true)
            }}
          />
        )}
      />

      {showDrawer && (
        <Drawer close={() => setShowDrawer(false)}>
          <Text>SOmething</Text>
        </Drawer>
      )}
    </View>
  )
}
