import { XStack, SizableText } from '@/ui'
import { Button as NativeButton, Text, StyleSheet, Pressable } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c, s } from '@/features/style'

export const Button = (props) => {
  const {
    onPress,
    title = 'Save',
    variant = '',
    iconBefore = '',
    iconAfter = '',
    iconColor = 'white',
  } = props

  let buttonVariant = null
  let textVariant = null
  let iconVariant = null
  if (variant in styles) {
    buttonVariant = styles?.[variant]
    textVariant = styles?.[`${variant}Text`]
    iconVariant = styles?.[`${variant}Icon`]
  }

  return (
    <Pressable style={[styles.button, buttonVariant]} onPress={onPress}>
      <XStack gap={s.$08}>
        {iconBefore && (
          <Ionicons
            style={[{ height: s.$1half }]}
            color={iconColor}
            name={iconBefore}
            size={s.$1}
          />
        )}
        <Text style={[styles.text, textVariant]}>{title}</Text>
        {iconAfter && (
          <Ionicons style={[{ height: s.$1half }]} color={iconColor} name={iconAfter} size={s.$1} />
        )}
      </XStack>
    </Pressable>
  )
}

export const MainButton = ({ title, onPress }) => <Button title={title} onPress={onPress} />

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: s.$4,
    elevation: 3,
    paddingVertical: s.$09,
    paddingHorizontal: s.$2,
    minWidth: s.$16,
    backgroundColor: c.accent,
  },
  small: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: s.$4,
    elevation: 3,
    paddingVertical: s.$08,
    paddingHorizontal: s.$2,
    minWidth: s.$8,
    backgroundColor: c.accent,
  },
  disabled: {
    backgroundColor: c.accent2,
  },
  basic: {
    backgroundColor: c.none,
    color: c.black,
  },
  large: {
    backgroundColor: c.none,
    color: c.black,
    paddingVertical: s.$1,
    paddingHorizontal: s.$3,
    minWidth: s.$20,
  },
  // Text
  text: {
    fontSize: s.$1,
    lineHeight: 22,
    fontFamily: 'Inter',
    color: 'white',
  },
  smallText: {
    fontSize: s.$09,
    lineHeight: 22,
  },
  largeText: {
    fontSize: s.$1,
    lineHeight: 22,
    fontFamily: 'Inter',
    color: 'white',
  },
  basicText: {
    color: 'black',
  },
})
