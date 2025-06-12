import { makeMutable, SharedValue } from 'react-native-reanimated'
import { create } from 'zustand'

type BackdropState = {
  moduleBackdropAnimatedIndex?: SharedValue<number>
  detailsBackdropAnimatedIndex?: SharedValue<number>
  otherProfileBackdropAnimatedIndex?: SharedValue<number>
  newRefSheetBackdropAnimatedIndex?: SharedValue<number>
  removeRefSheetBackdropAnimatedIndex?: SharedValue<number>
  doPress: () => void
  setDoPress: (doPress: () => void) => void
}

const moduleBackdropAnimatedIndex = makeMutable(0)
const detailsBackdropAnimatedIndex = makeMutable(-1)
const otherProfileBackdropAnimatedIndex = makeMutable(-1)
const newRefSheetBackdropAnimatedIndex = makeMutable(-1)
const removeRefSheetBackdropAnimatedIndex = makeMutable(-1)

export const useBackdropStore = create<BackdropState>((set) => ({
  moduleBackdropAnimatedIndex,
  detailsBackdropAnimatedIndex,
  otherProfileBackdropAnimatedIndex,
  newRefSheetBackdropAnimatedIndex,
  removeRefSheetBackdropAnimatedIndex,
  doPress: () => {},
  setDoPress: (doPress: () => void) => set({ doPress }),
}))
