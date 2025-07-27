import { makeMutable, SharedValue } from 'react-native-reanimated'
import { create } from 'zustand'

type BackdropState = {
  moduleBackdropAnimatedIndex?: SharedValue<number>
  detailsBackdropAnimatedIndex?: SharedValue<number>
  otherProfileBackdropAnimatedIndex?: SharedValue<number>
  removeRefSheetBackdropAnimatedIndex?: SharedValue<number>
  globalBackdropAnimatedIndex?: SharedValue<number>
  // Global state for header dimming
  headerBackdropAnimatedIndex: SharedValue<number>
  // handle backdrop press, we need to close the sheets
  backdropPressHandlers: Record<string, () => void>
  onBackdropPress: () => void
  registerBackdropPress: (onBackdropPress: () => void) => string
  unregisterBackdropPress: (key: string) => void
}

const moduleBackdropAnimatedIndex = makeMutable(-1)
const detailsBackdropAnimatedIndex = makeMutable(-1)
const otherProfileBackdropAnimatedIndex = makeMutable(-1)
const removeRefSheetBackdropAnimatedIndex = makeMutable(-1)
const globalBackdropAnimatedIndex = makeMutable(-1)
const headerBackdropAnimatedIndex = makeMutable(-1)

export const useBackdropStore = create<BackdropState>((set, get) => ({
  moduleBackdropAnimatedIndex,
  detailsBackdropAnimatedIndex,
  otherProfileBackdropAnimatedIndex,
  removeRefSheetBackdropAnimatedIndex,
  globalBackdropAnimatedIndex,
  headerBackdropAnimatedIndex,
  backdropPressHandlers: {},
  onBackdropPress: () => {},
  registerBackdropPress: (onBackdropPress: () => void) => {
    const key = Math.random().toString(36).substring(2, 15)
    const existingHandlers = get().backdropPressHandlers
    set({ backdropPressHandlers: { ...existingHandlers, [key]: onBackdropPress } })
    return key
  },
  unregisterBackdropPress: (key: string) => {
    const existingHandlers = { ...get().backdropPressHandlers }
    delete existingHandlers[key]
    set({ backdropPressHandlers: existingHandlers })
  },
}))
