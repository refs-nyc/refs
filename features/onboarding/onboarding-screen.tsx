import { OnboardingCarouselItem, Drawer, AddRef } from '@/ui'
import { View, Dimensions, Text } from 'react-native'
import { useRef, useState } from 'react'
import { router } from 'expo-router'
import { s, c } from '@/features/style/index'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

export function OnboardingScreen() {
  const ref = useRef<ICarouselInstance>(null)
  const win = Dimensions.get('window')
  const data = [{}, {}, {}, {}]

  const [addingIndex, setAddingIndex] = useState(-1)

  const nextSlide = (index: number) => {
    ref.current?.next()
  }

  const done = () => {
    router.push('/user/new')
  }

  return (
    <View style={{ flex: 1 }}>
      <Text
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: s.$6,
            right: s.$1,
            fontSize: s.$09,
            color: c.grey2,
            zIndex: 1000,
          }}
        >
          Back
      </Text>
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
              console.log('we have added ')
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
