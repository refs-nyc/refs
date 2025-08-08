import type { UISlice } from '@/ui/state'
import type { BackdropSlice } from './backdrop'
import type { ImageSlice } from './images'
import type { ItemSlice } from './items'
import type { MessageSlice } from './messages'
import type { UserSlice } from './users'
import type { UserCacheSlice } from './userCache'

export type StoreSlices = BackdropSlice &
  ImageSlice &
  ItemSlice &
  MessageSlice &
  UserSlice &
  UserCacheSlice &
  UISlice
