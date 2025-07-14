import { create } from 'zustand'
import { createBackdropSlice, type BackdropSlice } from './backdrop'
import { createImageSlice, type ImageSlice } from './images'
import { createItemSlice, type ItemSlice } from './items'
import { createMessageSlice, type MessageSlice } from './messages'
import { createUserSlice, type UserSlice } from './users'

export type StoreSlices = BackdropSlice & ImageSlice & ItemSlice & MessageSlice & UserSlice

export const useAppStore = create<StoreSlices>((...a) => ({
  ...createBackdropSlice(...a),
  ...createImageSlice(...a),
  ...createItemSlice(...a),
  ...createMessageSlice(...a),
  ...createUserSlice(...a),
}))
