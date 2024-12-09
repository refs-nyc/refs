import { OnboardingCarouselItem, Drawer, AddRef } from '@my/ui'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { Dimensions } from 'react-native'
import { useRef, useState } from 'react'
import { View, Text, SizableText } from 'tamagui'
import { useRouter } from 'solito/navigation'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useCanvasContext } from 'app/features/canvas/contract'

export function OnboardingScreen() {
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [{}, {}, {}, {}]

  const { app } = useCanvasContext()

  const router = useRouter()

  const [addingIndex, setAddingIndex] = useState(-1)

  const nextSlide = (index: number) => {
    ref.current?.next()
  }

  const done = () => router.push('/user/new')

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
            done={done}
            onAddItem={() => {
              setAddingIndex(index)
            }}
          />
        )}
      />

      {addingIndex > -1 && (
        <Drawer close={() => setAddingIndex(-1)}>
          <AddRef
            onAddRef={() => {
              setAddingIndex(-1)
            }}
            onCancel={() => {
              setAddingIndex(-1)
            }}
          />
        </Drawer>
      )}
    </View>
  )
}
