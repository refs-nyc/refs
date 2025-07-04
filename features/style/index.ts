import { StyleSheet } from 'react-native'

// From light to dark
export const c = {
  // The originals
  white: '#fff',
  black: '#000',
  // Accent colors
  accent: '#A5B89F',
  accent2: '#e7efe4',
  // Green
  olive: '#A5B89F',
  olive2: '#8D9C89',
  // Surface colors
  surface: '#F3F2ED',
  surface2: '#EFEDE3',
  // Greys
  grey1: '#D9D9D9',
  grey2: '#787676',
  muted: '#787676',
  muted2: '#414040',
  inactive: '#B6B5B2',
  // Rare
  none: 'transparent',
  red: '#f00',
}

// Based off Tamagui
export const spacing = {
  $0: 0,
  $025: 2,
  $05: 4,
  $075: 8,
  $08: 12,
  $09: 16,
  $1: 20,
  $1half: 24,
  $2: 28,
  $2half: 32,
  $3: 36,
  $3half: 40,
  $4: 44,
  $5: 52,
  $6: 64,
  $7: 74,
  $8: 84,
  $9: 94,
  $10: 104,
  $11: 124,
  $12: 144,
  $13: 164,
  $14: 184,
  $15: 204,
  $16: 224,
  $17: 224,
  $18: 244,
  $19: 264,
  $20: 284,
  // Other units
  full: '100%',
}
export const s = spacing

export const typo = StyleSheet.create({
  h1: {
    fontFamily: 'InterBold',
    fontSize: s.$2,
    lineHeight: s.$3,
    letterSpacing: -0.5,
  },
  h1normal: {
    fontFamily: 'Inter',
    fontSize: s.$2,
    lineHeight: s.$3,
    letterSpacing: -0.5,
  },
  h1light: {
    fontFamily: 'InterLight',
    fontSize: s.$2,
    lineHeight: s.$3,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'InterBold',
    fontSize: s.$1,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
  },
  h2semi: {
    fontFamily: 'InterSemiBold',
    fontSize: s.$1,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
  },
  h2normal: {
    fontFamily: 'Inter',
    fontWeight: 'normal',
    fontSize: s.$1,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
  },
  h2normalitalic: {
    fontFamily: 'InterItalic',
    fontSize: s.$1,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
  },
  h2light: {
    fontFamily: 'InterLight',
    fontSize: s.$1,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: 'InterBold',
    fontSize: s.$1,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
  },
  h3semi: {
    fontFamily: 'InterSemiBold',
    fontWeight: 400,
    fontSize: s.$1,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
  },
  h3normal: {
    fontFamily: 'Inter',
    fontWeight: 'normal',
    fontSize: s.$1,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
  },
  mutewarn: {
    fontFamily: 'Inter',
    fontSize: s.$09,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
    color: c.muted,
  },
  p: {
    fontFamily: 'Inter',
    fontSize: s.$09,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
    // color: c.black,
  },
  psemi: {
    fontFamily: 'InterSemiBold',
    fontWeight: 400,
    fontSize: s.$09,
    lineHeight: s.$1half,
    // color: c.black,
  },
  pmuted: {
    fontFamily: 'Inter',
    fontSize: s.$09,
    lineHeight: s.$1half,
    letterSpacing: -0.5,
    color: c.muted,
    // paddingHorizontal: s.$2,
  },
  small: {
    fontSize: 14,
    lineHeight: 18,
    color: c.black,
  },
  smallmuted: {
    fontSize: 14,
    lineHeight: 18,
    color: c.muted,
  },
  semistrong: {
    fontFamily: 'InterSemiBold',
  },
  strong: {
    fontFamily: 'InterBold',
  },
  boldItalic: {
    fontFamily: 'InterBoldItalic',
  },
  italic: {
    fontFamily: 'InterItalic',
  },
  light: {
    fontFamily: 'InterLight',
  },
  lightItalic: {
    fontFamily: 'InterLightItalic',
  },
})

export const t = typo

export const base = StyleSheet.create({
  gridTile: {
    aspectRatio: 1,
    backgroundColor: c.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: s.$075,
  },
  smallSquare: {
    width: s.$2,
    height: s.$2,
    borderRadius: 4,
  },
  largeSquare: {
    width: s.$4,
    height: s.$4,
    borderRadius: 8,
  },
  nonEditableItem: {
    backgroundColor: c.surface,
    borderColor: c.surface,
    borderWidth: 2,
    borderRadius: s.$1,
  },
  editableItem: {
    backgroundColor: c.surface,
    borderColor: c.grey1,
    borderWidth: 2,
    borderRadius: s.$1,
  },
})

export { Icon } from '@/assets/icomoon/IconFont'
