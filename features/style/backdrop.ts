import { makeMutable, SharedValue } from 'react-native-reanimated'
import { create } from 'zustand'

type BackdropState = {
  animatedIndex?: SharedValue<number>
  maxOpacity: number
  setMaxOpacity: (opacity: number) => void
  disappearsOnIndex: number
  setDisappearsOnIndex: (index: number) => void
  appearsOnIndex: number
  setAppearsOnIndex: (index: number) => void
}

const animatedIndex = makeMutable(0)

export const useBackdropStore = create<BackdropState>((set) => ({
  animatedIndex,
  maxOpacity: 0.5,
  setMaxOpacity: (opacity: number) => set({ maxOpacity: opacity }),
  disappearsOnIndex: 0,
  setDisappearsOnIndex: (index: number) => set({ disappearsOnIndex: index }),
  appearsOnIndex: 1,
  setAppearsOnIndex: (index: number) => set({ appearsOnIndex: index }),
}))
