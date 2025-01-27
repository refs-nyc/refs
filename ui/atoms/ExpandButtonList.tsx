import { useState, useEffect } from 'react'
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'
import { View, Text, Pressable } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { SizableText } from '../typo/SizableText'
import { Button } from '../buttons/Button'
import { c, s, t } from '@/features/style'

// Used in the onboarding
export const ExampleButtonList = () => {
  const [expanded, setExpanded] = useState(false)
  const [expanded2, setExpanded2] = useState(false)
  let timeout: ReturnType<typeof setTimeout>

  const width = useSharedValue(0)
  const width2 = useSharedValue(0)

  const updateWidth = () => {
    setExpanded(!expanded)
  }
  const updateWidth2 = () => {
    setExpanded2(!expanded2)
  }

  const onPress = () => {
    console.log('on Press')
    clearTimeout(timeout)
    updateWidth()
  }
  const onPress2 = () => {
    console.log('on Press 2')
    clearTimeout(timeout)
    updateWidth2()
  }

  useEffect(() => {
    timeout = setTimeout(() => {
      setExpanded(true)
    }, 3000)
    timeout = setTimeout(() => {
      setExpanded2(true)
    }, 5000)
  }, [])

  useEffect(() => {
    width.set(withSpring(expanded ? 250 : 10, { stiffness: expanded ? 100 : 10 }))
    width2.set(withSpring(expanded2 ? 280 : 10, { stiffness: expanded2 ? 100 : 10 }))
  }, [expanded, expanded2])

  return (
    <View style={{ width: '100%', aspectRatio: 1, justifyContent: 'center' }}>
      <YStack gap={s.$4} style={{ justifyContent: 'center' }}>
        <Pressable onPress={onPress}>
          <XStack>
            <View style={{ position: 'relative', zIndex: 1 }}>
              <Button
                onPress={onPress}
                title="Message"
                variant="small"
                iconAfter="send"
                iconColor={c.white}
              />
            </View>
            <Animated.View style={{ width: width, position: 'relative', left: -60 }}>
              <View
                style={{
                  borderRadius: s.$10,
                  height: 46,
                  width: 242,
                  backgroundColor: c.white,
                  overflow: 'hidden',
                  borderColor: c.accent,
                  borderWidth: s.$025,
                }}
              >
                <XStack
                  style={{ alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                >
                  <View style={{ width: s.$8 }}>
                    <SizableText style={{ color: c.accent, textAlign: 'center' }}>
                      Group
                    </SizableText>
                  </View>
                  <View style={{ width: 2, height: '70%', backgroundColor: c.accent2 }}></View>
                  <View style={{ width: s.$7 }}>
                    <SizableText style={{ color: c.accent, textAlign: 'center' }}>DM</SizableText>
                  </View>
                </XStack>
              </View>
            </Animated.View>
          </XStack>
        </Pressable>
        {/* Save */}
        <Pressable onPress={onPress2}>
          <XStack
            style={{
              justifyContent: 'flex-end',
              flexDirection: 'row-reverse',
            }}
          >
            <Animated.View
              style={{
                width: width2,
                alignSelf: 'flex-end',
                flexDirection: 'row-reverse',
                position: 'relative',
                right: 60,
              }}
            >
              <View
                style={{
                  borderRadius: s.$10,
                  height: 46,
                  width: 294,
                  backgroundColor: c.white,
                  overflow: 'hidden',
                  borderColor: c.accent,
                  borderWidth: s.$025,
                }}
              >
                <XStack
                  style={{ alignItems: 'center', justifyContent: 'flex-start', height: '100%' }}
                >
                  <View style={{ width: s.$8 }}>
                    <SizableText style={{ color: c.accent, textAlign: 'center' }}>
                      Dates
                    </SizableText>
                  </View>
                  <View style={{ width: 2, height: '70%', backgroundColor: c.accent2 }}></View>
                  <View style={{ width: s.$11 }}>
                    <SizableText style={{ color: c.accent, textAlign: 'center' }}>
                      Dinner Invites
                    </SizableText>
                  </View>
                </XStack>
              </View>
            </Animated.View>
            <View style={{ position: 'absolute', zIndex: 1, right: 0 }}>
              <Button
                onPress={onPress2}
                title="Save"
                variant="small"
                iconBefore="bookmark"
                iconColor={c.white}
              />
            </View>
          </XStack>
        </Pressable>
      </YStack>
    </View>
  )
}
