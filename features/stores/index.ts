import { create } from 'zustand'
import { createBackdropSlice } from './backdrop'
import { createImageSlice } from './images'
import { createItemSlice } from './items'
import { createMessageSlice } from './messages'
import { createUserSlice } from './users'
import type { StoreSlices } from './types'

export const useAppStore = create<StoreSlices>((...a) => ({
  ...createBackdropSlice(...a),
  ...createImageSlice(...a),
  ...createItemSlice(...a),
  ...createMessageSlice(...a),
  ...createUserSlice(...a),
}))
