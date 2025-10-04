import { create } from 'zustand'
import { createBackdropSlice } from './backdrop'
import { createImageSlice } from './images'
import { createItemSlice } from './items'
import { createMessageSlice } from './messages'
import { createProfileBundleSlice } from './profileBundles'
import { createUserSlice } from './users'
import { createUserCacheSlice } from './userCache'
import type { StoreSlices } from './types'
import { createUISlice } from '@/ui/state'

export const useAppStore = create<StoreSlices>((...a) => ({
  ...createBackdropSlice(...a),
  ...createImageSlice(...a),
  ...createItemSlice(...a),
  ...createMessageSlice(...a),
  ...createProfileBundleSlice(...a),
  ...createUserSlice(...a),
  ...createUserCacheSlice(...a),
  ...createUISlice(...a),
}))

if (__DEV__) {
  console.log('⚙️ store instrumentation attached (setHomePagerIndex logging in ui/state.ts)')
}
