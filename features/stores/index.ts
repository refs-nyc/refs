import { create } from 'zustand'
import { createBackdropSlice } from './backdrop'
import { createImageSlice } from './images'
import { createItemSlice } from './items'
import { createMessageSlice } from './messages'
import { createUserSlice } from './users'
import { createUserCacheSlice } from './userCache'
import type { StoreSlices } from './types'
import { createUISlice } from '@/ui/state'
import { createFeedSlice } from './feed'

export const useAppStore = create<StoreSlices>((...a) => ({
  ...createBackdropSlice(...a),
  ...createImageSlice(...a),
  ...createItemSlice(...a),
  ...createMessageSlice(...a),
  ...createUserSlice(...a),
  ...createUserCacheSlice(...a),
  ...createFeedSlice(...a),
  ...createUISlice(...a),
}))
