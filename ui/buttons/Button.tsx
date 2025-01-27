import { XStack } from '@/ui/core/Stacks'
import { Button as NativeButton, Text, StyleSheet, Pressable } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Icon } from '@/features/style'
import { c, s, t } from '@/features/style'

type ButtonVariant = keyof typeof styles
type ButtonProps = {
  onPress: () => void
  title?: string
  variant?: ButtonVariant
  iconBefore?: keyof typeof Ionicons.glyphMap
  iconBeforeCustom?: boolean
  iconAfter?: keyof typeof Ionicons.glyphMap
  iconAfterCustom?: boolean
  iconColor?: string
  disabled?: boolean
  align?: 'center' | 'flex-start' | 'flex-end'
  style?: any
  iconSize?: number
}

export const Button = (props: ButtonProps) => {
  const {
    onPress,
    title = 'Save',
    variant = '',
    iconBefore = '',
    iconBeforeCustom = false,
    iconAfterCustom = false,
    iconAfter = '',
    iconColor = 'white',
    disabled = false,
    align = 'center',
    iconSize = s.$1,
  } = props

  let buttonVariant = null
  let textVariant = null
  let iconVariant = null
  if (variant && variant in styles) {
    buttonVariant = styles[variant]
    textVariant = styles[`${variant}Text` as keyof typeof styles]
    iconVariant = styles[`${variant}Icon` as keyof typeof styles]
  }

  return (
    <Pressable
      style={[
        { alignItems: align },
        styles.button,
        buttonVariant,
        props?.style,
        disabled && styles.disabled,
      ]}
      onPress={!disabled ? onPress : () => {}}
    >
      <XStack style={{ alignItems: 'center' }} gap={s.$08}>
        {iconBefore && iconBeforeCustom ? (
          <Icon size={iconSize} name={iconBefore} color={iconColor} />
        ) : (
          <Ionicons
            style={[{ height: iconSize }]}
            color={iconColor}
            name={iconBefore}
            size={iconSize}
          />
        )}
        <Text style={[styles.text, textVariant]}>{title}</Text>
        {iconAfter && iconAfterCustom ? (
          <Icon size={iconSize} name={iconAfter} color={iconColor} />
        ) : (
          <Ionicons
            style={[{ height: iconSize }]}
            color={iconColor}
            name={iconAfter}
            size={iconSize}
          />
        )}
      </XStack>
    </Pressable>
  )
}

export const MainButton = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <Button title={title} onPress={onPress} />
)

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: s.$4,
    elevation: 3,
    paddingVertical: s.$08,
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
  smallMuted: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: c.accent2,
  },
  basic: {
    backgroundColor: c.surface,
    color: c.black,
  },
  basicLeft: {
    backgroundColor: c.none,
    color: c.black,
    paddingHorizontal: 0,
    alignItems: 'flex-start',
  },
  large: {
    backgroundColor: c.none,
    paddingVertical: s.$1,
    paddingHorizontal: s.$3,
    minWidth: s.$20,
  },
  outline: {
    backgroundColor: c.surface,
    borderColor: c.black,
    borderWidth: 2,
  },
  fluid: {
    width: '100%',
  },
  outlineFluid: {
    width: '100%',
    backgroundColor: c.surface,
    borderColor: c.black,
    borderWidth: 2,
  },
  // Text
  text: {
    // fontSize: s.$1,
    // lineHeight: 22,
    // fontFamily: 'Inter',
    ...t.p,
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
  smallMutedText: {
    ...t.smallmuted,
  },
  basicLeftText: {
    color: 'black',
    textAlign: 'left',
  },
  outlineFluidText: {
    color: c.black,
  },
  outlineText: {
    color: c.black,
  },
})
