import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, View, Text } from 'react-native'
import { c } from '@/features/style'

type Slide = React.ReactNode | string
type SlideSpec = { content: Slide; durationMs?: number }

export function LoopingFadeCarousel({
  slides,
  intervalMs = 3750,
  fadeMs = 560,
  pauseMs = 375,
  freezeIndex,
}: {
  slides: (Slide | SlideSpec)[]
  intervalMs?: number
  fadeMs?: number
  pauseMs?: number
  freezeIndex?: number
}) {
  const [index, setIndex] = useState(0)
  const opacity = useRef(new Animated.Value(0)).current

  const rendered = useMemo(() => {
    const spec = slides[index] as SlideSpec | Slide
    const s = (spec as any)?.content ?? spec
    if (typeof s === 'string') {
      return (
        <Animated.Text
          style={{
            opacity,
            textAlign: 'left',
            color: c.accent,
            fontFamily: 'Inter-Medium',
            fontSize: 24,
          }}
        >
          {s}
        </Animated.Text>
      )
    }
    return <Animated.View style={{ opacity }}>{s}</Animated.View>
  }, [slides, index, opacity])

  useEffect(() => {
    // Ensure we fade in the very first slide
    Animated.timing(opacity, { toValue: 1, duration: fadeMs, useNativeDriver: true }).start()

    let cancelled = false
    const tick = () => {
      if (cancelled) return
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        const nextIndex = (index + 1) % slides.length
        const spec = slides[nextIndex] as SlideSpec | Slide
        const nextDuration = ((spec as any)?.durationMs as number | undefined) ?? intervalMs
        setTimeout(() => {
          setIndex(nextIndex)
          Animated.timing(opacity, {
            toValue: 1,
            duration: fadeMs,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            if (freezeIndex !== undefined && ((nextIndex) % slides.length) === freezeIndex) {
              return
            }
            setTimeout(tick, nextDuration)
          })
        }, pauseMs)
      })
    }
    const currentSpec = slides[index] as SlideSpec | Slide
    const initialDuration = ((currentSpec as any)?.durationMs as number | undefined) ?? intervalMs
    if (freezeIndex !== undefined && index === freezeIndex) {
      return () => {
        cancelled = true
      }
    }
    const timer = setTimeout(tick, initialDuration)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slides, index, intervalMs, fadeMs, opacity])

  return <View style={{ width: '100%' }}>{rendered}</View>
}

