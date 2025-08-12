import React from 'react'
import { View, Pressable, Animated } from 'react-native'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { s, c } from '@/features/style'
import { Button } from '../buttons/Button'

export function PinnedProfileStep({
  children,
  onNext,
  onBack,
  nextDisabled,
  canGoBack,
  inputWidth = '100%',
  translateX = 0,
  contentWidth,
}: {
  children: React.ReactNode
  onNext: () => void
  onBack: () => void
  nextDisabled: boolean
  canGoBack: boolean
  inputWidth?: number | string
  translateX?: number
  contentWidth?: number | string
}) {
  const kb = useKeyboardHeight()
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: kb + s.$2 - 12,
        paddingHorizontal: s.$1half,
        transform: [{ translateX }],
      }}
    >
      <View style={{ backgroundColor: 'transparent', width: contentWidth as any, alignSelf: 'center' }}>{children}</View>
      <View style={{ marginTop: (s as any).$05 + 5, position: 'relative', width: contentWidth as any, alignSelf: 'center' }}>
        {canGoBack && (
          <Pressable onPress={onBack} style={{ position: 'absolute', left: 0, top: 8, padding: s.$075 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: c.surface,
                opacity: 0.6,
              }}
            />
          </Pressable>
        )}
        <Button
          title="Next"
          variant="raised"
          onPress={onNext}
          disabled={nextDisabled}
          style={{ width: inputWidth, opacity: nextDisabled ? 0.4 : 1 }}
        />
      </View>
    </Animated.View>
  )
}

