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
  bottomOffsetExtra = 0,
  nextTitle = 'Next',
}: {
  children: React.ReactNode
  onNext: () => void
  onBack: () => void
  nextDisabled: boolean
  canGoBack: boolean
  inputWidth?: number | string
  translateX?: number
  contentWidth?: number | string
  bottomOffsetExtra?: number
  nextTitle?: string
}) {
  const kb = useKeyboardHeight()
  const extraWhenKeyboardHidden = kb === 0 ? 10 : 0
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: kb + s.$2 - 12 + bottomOffsetExtra + extraWhenKeyboardHidden,
        paddingHorizontal: s.$1half,
        transform: [{ translateX }],
      }}
    >
      {/* Back button intentionally omitted; a global back is handled by parent */}
      <View style={{ backgroundColor: 'transparent', width: contentWidth as any, alignSelf: 'center' }}>{children}</View>
      <View style={{ marginTop: (s as any).$05 + 5, position: 'relative', width: contentWidth as any, alignSelf: 'center' }}>
        <Button
          title={nextTitle}
          variant="raised"
          onPress={onNext}
          disabled={nextDisabled}
          style={{ width: inputWidth, opacity: nextDisabled ? 0.4 : 1 }}
          textStyle={{ fontSize: 18 }}
        />
      </View>
    </Animated.View>
  )
}

