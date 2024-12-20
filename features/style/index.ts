import { Dimensions, StyleSheet } from 'react-native'

const dimensions = Dimensions.get('window')

// From light to dark
export const c = {
  // The originals
  white: '#fff',
  black: '#000',
  // Accent colors
  accent: '#7F70B8',
  accent2: '#D5CDF3',
  // Surface colors
  surface: '#F3F2ED',
  surface2: '#EFEDE3',
  // Greys
  grey1: '#D9D9D9',
  grey2: '#787676',
  muted: '#787676',
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
  h2normal: {
    fontFamily: 'Inter',
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
  h3normal: {
    fontFamily: 'Inter',
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

const TILE_SIZE = (dimensions.width - s.$2 * 2 - s.$075) / 3

export const t = typo

export const base = StyleSheet.create({
  gridTile: {
    width: TILE_SIZE,
    aspectRatio: 1,
    backgroundColor: c.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    // overflow: 'hidden',
    borderRadius: s.$075,
    // flex: 1,
  },
})
