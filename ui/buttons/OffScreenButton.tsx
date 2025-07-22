import React from 'react'
import { Pressable, Text, ViewStyle, View } from 'react-native'
import { c, s } from '@/features/style'
import { XStack } from '@/ui/core/Stacks'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'

const HEADER_HEIGHT = s.$8

interface OffScreenButtonProps {
  title: string
  onPress: () => void
  style?: ViewStyle
  disabled?: boolean
}

export default function OffScreenButton({ 
  title, 
  onPress, 
  style, 
  disabled = false 
}: OffScreenButtonProps) {
  return (
    <View style={{
      position: 'absolute',
      bottom: -s.$4 - 15, // Extend below the home indicator and move down 15px
      left: -s.$3, // Less horizontal extension to show shoulder curve
      right: -s.$3,
      height: s.$12, // Fixed height to extend off-screen
      backgroundColor: c.olive,
      borderRadius: 50, // Much larger radius for shoulder curve
      paddingTop: s.$2,
    }}>
              <Pressable
          onPress={onPress}
          disabled={disabled}
          style={{ opacity: disabled ? 0.5 : 1 }}
        >
          <XStack
            gap={5}
            style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, height: HEADER_HEIGHT, marginTop: -25 }}
          >
            <Text style={{ color: c.surface, fontSize: s.$1, fontFamily: 'InterBold', lineHeight: s.$3, letterSpacing: -0.5, flexShrink: 0 }}>{title}</Text>
          </XStack>
        </Pressable>
      </View>
  )
} 
 
 
 