import { XStack, SizableText } from '@/ui'
import { Button as NativeButton, Text, StyleSheet, Pressable } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { c, s } from '@/features/style'

export const Button = (props) => {
  const { onPress, title = 'Save', variant = '' } = props

  let buttonVariant = null
  let textVariant = null
  if (variant in styles) {
    buttonVariant = styles?.[variant]
    textVariant = styles?.[`${variant}Text`]
  }

  return (
    <Pressable style={[styles.button, buttonVariant]} onPress={onPress}>
      <Text style={[styles.text, textVariant]}>{title}</Text>
    </Pressable>
  )
}

export const MainButton = ({ title, onPress }) => <Button title={title} onPress={onPress} />

export const SendButton = () => {
  return (
    <XStack
      style={{
        width: s.$12,
        height: s.$5,
        borderRadius: s.$10,
        backgroundColor: c.accent,
        gap: s.$3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SizableText style={{ color: c.white }} size={s.$4}>
        Message
      </SizableText>
      <Ionicons color="white" name="send-outline" size={s.$1half} />
    </XStack>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s.$1,
    paddingHorizontal: s.$3,
    minWidth: s.$20,
    borderRadius: s.$4,
    elevation: 3,
    backgroundColor: c.accent,
  },
  disabled: {
    backgroundColor: c.accent2,
  },
  basic: {
    backgroundColor: c.none,
    color: c.black,
  },
  // Text
  text: {
    fontSize: s.$1,
    lineHeight: 22,
    fontFamily: 'Inter',
    color: 'white',
  },
  basicText: {
    color: 'black',
  },
})
