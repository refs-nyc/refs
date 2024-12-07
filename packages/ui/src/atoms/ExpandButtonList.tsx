import { useState, useEffect } from 'react'
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'
import { Pressable } from 'react-native'
import { View, XStack, YStack, SizableText } from 'tamagui'
import { SendButton } from '../buttons/Button'

// Used in the onboarding
export const ExampleButtonList = () => {
  const [expanded, setExpanded] = useState(false)
  let timeout: ReturnType<typeof setTimeout>

  const width = useSharedValue(0)

  const updateWidth = () => {
    console.log('update w')
    console.log(!expanded)
    setExpanded(!expanded)
  }

  const onPress = () => {
    console.log('on Press')
    clearTimeout(timeout)
    updateWidth()
  }

  useEffect(() => {
    timeout = setTimeout(() => setExpanded(true), 3000)
  }, [])

  useEffect(() => {
    width.value = withSpring(expanded ? 230 : 10, { stiffness: expanded ? 100 : 10 })
  }, [expanded])

  return (
    <View width="100%" aspectRatio={1}>
      <YStack flex={1} jc="center">
        <Pressable onPress={onPress}>
          <XStack>
            <View style={{ position: 'relative', zIndex: 1 }}>
              <SendButton />
            </View>
            <Animated.View style={{ width: width, position: 'relative', left: -60 }}>
              {/* Just for spacing */}
              <View
                borderRadius="$12"
                width="100%"
                height="$5"
                bg="$white"
                style={{ overflow: 'hidden' }}
                borderColor="$accent"
                borderWidth={1.5}
              >
                <XStack ai="center" jc="flex-end" height="100%">
                  <View width="$8">
                    <SizableText col="$accent" size="$4" ta="center">
                      Group
                    </SizableText>
                  </View>
                  <View width={1.5} height="70%" bg="$accent"></View>
                  <View width="$8">
                    <SizableText col="$accent" size="$4" ta="center">
                      DM
                    </SizableText>
                  </View>
                </XStack>
              </View>
            </Animated.View>
          </XStack>
        </Pressable>
      </YStack>
    </View>
  )
}
