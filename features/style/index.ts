import { StyleSheet } from 'react-native'

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
  // Rare
  none: 'transparent',
}

// Based off Tamagui
export const spacing = {
  $0: 0,
  $025: 2,
  $05: 4,
  $075: 8,
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
  },
  h1normal: {
    fontFamily: 'Inter',
    fontSize: s.$2,
  },
  strong: {
    fontFamily: 'InterBold',
  },
})

export const base = StyleSheet.create({
  gridTile: {
    aspectRatio: 1,
    flex: 1,
  },
})
