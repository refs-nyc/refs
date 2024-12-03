import Carousel from 'react-native-reanimated-carousel'
import { useState } from 'react'
import { View, Text } from 'react-native'
import { styles } from '@exp/styles'

export default function Onboarding() {
  const [index, setIndex] = useState(0)

  console.log(styles)

  // const renderOnboardingSlide = () => {
  //   return <View></View>
  // }

  return (
    <Text>Hello World</Text>
    // <View style={[{ width: styles.fullWidth, height: styles.fullHeight }]}>
    //   {/* <Carousel
    //     width={styles.fullWidth}
    //     loop={false}
    //     enabled={true}
    //     ref={ref}
    //     testID={'xxx'}
    //     style={{ width: '100%' }}
    //     autoPlay={false}
    //     data={items}
    //     pagingEnabled={false}
    //     onSnapToItem={(i) => setIndex(i)}
    //     renderItem={renderOnboardingSlide}
    //   /> */}
    // </View>
  )
}
