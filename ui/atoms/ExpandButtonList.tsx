import React, { useState, useEffect } from 'react'
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'
import { View, Text, Pressable, LayoutChangeEvent } from 'react-native'
import { XStack, YStack } from '../core/Stacks'
import { SizableText } from '../typo/SizableText'
import { Button } from '../buttons/Button'
import { c, s, t } from '@/features/style'
import Ionicons from '@expo/vector-icons/Ionicons'

type ExpandOption = {
  label: string
  width?: number // Optional fixed width for the option
  fillRemaining?: boolean // Add this new property
}

type ExpandButtonProps = {
  title: string
  icon?: string
  iconPosition?: 'before' | 'after'
  options: ExpandOption[]
  expandDirection?: 'left' | 'right'
  onOptionSelect?: (option: ExpandOption) => void
  containerWidth?: number // Add this to know total available width
  fillRemaining?: boolean // Add this as a component prop instead
}

export const ExpandButton = ({
  title,
  expandDirection = 'right',
  options,
  icon,
  fillRemaining = false, // Add default value
}: ExpandButtonProps) => {
  const [expand, setExpand] = useState(false)
  const translateX = useSharedValue(1000)
  const [buttonWidth, setButtonWidth] = useState(0)
  const [optionsWidth, setOptionsWidth] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [availableSpace, setAvailableSpace] = useState(0)

  const height = 54
  const borderRadius = 100
  const paddingHorizontal = 32

  useEffect(() => {
    // Calculate the offset based on container widths
    const offset = expandDirection === 'right' ? optionsWidth : -optionsWidth
    translateX.value = withSpring(expand ? 0 : offset, {
      stiffness: 100,
      overshootClamping: true,
    })
  }, [expand, expandDirection, optionsWidth])

  useEffect(() => {
    // Calculate available space for filling
    if (containerWidth && optionsWidth) {
      const usedSpace = optionsWidth
      const remaining = containerWidth - usedSpace
      setAvailableSpace(Math.max(0, remaining))
    }
  }, [containerWidth, optionsWidth])

  const toggleExpand = () => {
    setExpand(!expand)
  }

  const onContainerLayout = (event: LayoutChangeEvent) => {
    if (containerWidth === 0) {
      setContainerWidth(event.nativeEvent.layout.width)
    }
  }

  const onButtonLayout = (event: LayoutChangeEvent) => {
    if (buttonWidth === 0) {
      setButtonWidth(event.nativeEvent.layout.width)
    }
  }

  const onOptionsLayout = (event: LayoutChangeEvent) => {
    if (optionsWidth === 0) {
      setOptionsWidth(event.nativeEvent.layout.width)
    }
  }

  const onItemPress = (o, i) => {
    console.log(o.label)
  }

  return (
    <View
      onLayout={onContainerLayout}
      style={{
        width: '100%',
        height: height,
        borderRadius: borderRadius,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onLayout={onButtonLayout}
        style={{
          position: 'absolute',
          alignSelf: expandDirection === 'left' ? 'flex-start' : 'flex-end',
          backgroundColor: c.accent,
          height: height,
          alignItems: 'center',
          flexDirection: expandDirection === 'left' ? 'row-reverse' : 'row',
          justifyContent: 'center',
          paddingHorizontal: paddingHorizontal,
          borderRadius: borderRadius,
          gap: 16,
          zIndex: 1,
        }}
        onPress={toggleExpand}
      >
        <Ionicons size={20} color={c.white} name={icon} />
        <Text style={{ color: 'white' }}>{title}</Text>
      </Pressable>

      {/* The items */}
      <Animated.View
        onLayout={onOptionsLayout}
        style={{
          position: 'absolute',
          flexDirection: expandDirection === 'left' ? 'row' : 'row-reverse',
          backgroundColor: c.white,
          borderRadius: borderRadius,
          alignSelf: expandDirection === 'left' ? 'flex-start' : 'flex-end',
          height: height,
          borderWidth: 2,
          borderColor: c.accent2,
          paddingLeft:
            paddingHorizontal +
            (expandDirection === 'left'
              ? buttonWidth + (fillRemaining ? availableSpace - 4 : 0) // -4 magic number for rounded borders
              : 0),
          paddingRight:
            paddingHorizontal +
            (expandDirection === 'right'
              ? buttonWidth + (fillRemaining ? availableSpace - 4 : 0)
              : 0),
          alignItems: 'center',
          gap: 20,
          zIndex: 0,
          transform: [{ translateX }],
        }}
      >
        {options.map((o, i) => (
          <React.Fragment key={o.label + i}>
            <Pressable onPress={() => onItemPress(o, i)}>
              <SizableText style={{ color: c.accent, textAlign: 'center' }}>{o.label}</SizableText>
            </Pressable>
            {i !== options.length - 1 && (
              <View style={{ width: 2, height: height - 20, backgroundColor: c.accent2 }}></View>
            )}
          </React.Fragment>
        ))}
      </Animated.View>
    </View>
  )
}

// Example usage:
export const ExampleButtonList = () => {
  return (
    <YStack gap={s.$1}>
      <ExpandButton
        title="Message"
        icon="send"
        options={[{ label: 'Group' }, { label: 'DM' }]}
        expandDirection="left"
      />

      <ExpandButton
        title="Save"
        icon="bookmark"
        iconPosition="before"
        options={[{ label: 'Dates' }, { label: 'Dinner Invites' }]}
        expandDirection="right"
      />
    </YStack>
  )
}
