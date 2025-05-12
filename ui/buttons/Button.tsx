import { useState } from 'react'
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
  iconButton?: boolean
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
    iconBefore = '' as keyof typeof Ionicons.glyphMap,
    iconBeforeCustom = false,
    iconAfterCustom = false,
    iconAfter = '' as keyof typeof Ionicons.glyphMap,
    iconButton = false,
    iconColor = 'white',
    disabled = false,
    align = 'center',
    iconSize = s.$1half,
  } = props

  let buttonVariant = null
  let textVariant = null
  let iconVariant = null
  let pressedVariant = null

  const [pressed, setPressed] = useState(false)

  if (variant && variant in styles) {
    buttonVariant = styles[variant]
    textVariant = styles[`${variant}Text` as keyof typeof styles]
    iconVariant = styles[`${variant}Icon` as keyof typeof styles]
    pressedVariant = styles[`${variant}Pressed` as keyof typeof styles]
  }

  return (
    <Pressable
      style={[
        { alignItems: align },
        styles.button,
        buttonVariant,
        props?.style,
        disabled && styles.disabled,
        pressed && pressedVariant,
        iconButton && {
          minWidth: 0,
          paddingVertical: 8,
          paddingHorizontal: 8,
          borderRadius: s.$09,
        },
      ]}
      onTouchStart={() => {
        setPressed(true)
      }}
      onTouchEnd={() => {
        setPressed(false)
      }}
      onPress={!disabled ? onPress : () => {}}
    >
      <XStack style={{ alignItems: 'center' }} gap={iconButton ? 0 : s.$08}>
        {iconBefore && iconBeforeCustom ? (
          <Icon size={iconSize} name={iconBefore} color={iconColor} />
        ) : (
          <Ionicons
            style={[{ height: iconSize }]}
            color={(iconVariant as any)?.color || iconColor}
            name={iconBefore}
            size={iconSize}
          />
        )}

        {!iconButton && <Text style={[styles.text, textVariant]}>{title}</Text>}

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
    minWidth: s.$8,
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
    width: 'auto',
  },
  smallMuted: {
    backgroundColor: 'transparent',
  },
  whiteOutline: {
    borderColor: 'white',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  whiteInverted: {
    borderColor: 'white',
    borderWidth: 1,
    backgroundColor: 'white',
  },
  smallWhiteOutline: {
    borderColor: 'white',
    borderWidth: 1,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: s.$05,
  },
  disabled: {
    opacity: 0.6,
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
  inlineSmallMuted: {
    backgroundColor: c.surface2,
    borderRadius: 20,
    paddingHorizontal: 0,
  },
  raised: {
    transform: 'translateY(0px)',
    backgroundColor: c.accent,
    shadowColor: '#655797',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  raisedPressed: {
    transform: 'translateY(6px)',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
  },
  raisedSecondaryPressed: {
    transform: 'translateY(6px)',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
  },
  raisedSecondary: {
    transform: 'translateY(0px)',
    backgroundColor: c.white,
    shadowColor: '#999999',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  raisedSecondaryIcon: {
    color: '#707070',
  },
  raisedPressedSecondary: {
    transform: 'translateY(6px)',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
  },
  // Text
  text: {
    ...t.psemi,
    color: 'white',
    fontWeight: 400,
  },
  raisedSecondaryText: {
    ...t.psemi,
    color: '#707070',
    fontWeight: 400,
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
    ...t.pmuted,
  },
  inlineSmallMutedText: {
    ...t.smallmuted,
  },
  basicLeftText: {
    ...t.h3normal,
    fontWeight: 'normal',
    color: 'black',
    textAlign: 'left',
  },
  outlineFluidText: {
    color: c.black,
  },
  outlineText: {
    color: c.black,
  },
  smallWhiteOutlineText: {
    ...t.small,
    color: 'white',
  },
  whiteInvertedText: {
    color: c.olive,
  },
})
