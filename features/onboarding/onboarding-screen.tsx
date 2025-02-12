import { OnboardingCarouselItem, NewRef } from '@/ui'
import { View, Dimensions, Text } from 'react-native'
import { useRef, useState, useCallback } from 'react'
import { router } from 'expo-router'
import { s, c } from '@/features/style/index'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { Sheet } from '@/ui'

export function OnboardingScreen() {
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [{}, {}, {}, {}]

  const [addingIndex, setAddingIndex] = useState(-1)
  const [step, setStep] = useState('')

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
        <Sheet full={step !== ''} onChange={(e) => e === -1 && setAddingIndex(-1)}>
          <NewRef
            onNewRef={() => {
              setAddingIndex(-1)
            }}
            onStep={setStep}
            onCancel={() => {
              setAddingIndex(-1)
            }}
          />
        </Sheet>
      )}
    </View>
  )
}
