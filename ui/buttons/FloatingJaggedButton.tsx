import React from 'react'
import { Pressable, StyleSheet, ViewStyle } from 'react-native'
import { SizableText } from '../typo/SizableText'
import { c } from '@/features/style'

interface FloatingJaggedButtonProps {
  onPress: () => void
  elevation?: number
  style?: ViewStyle
}

const FloatingJaggedButton: React.FC<FloatingJaggedButtonProps> = ({
  onPress,
  elevation = 4,
  style,
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        {
          elevation,
          shadowOffset: { width: 0, height: elevation },
          shadowOpacity: 0.25,
          shadowRadius: elevation,
        },
        style,
      ]}
    >
      <SizableText style={styles.text}>🔍</SizableText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
  },
  text: {
    color: 'white',
    fontSize: 20,
  },
})

export default FloatingJaggedButton 