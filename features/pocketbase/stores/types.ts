import { ImagePickerAsset } from 'expo-image-picker'

import * as PBTypes from './pocketbase-types'

// Logged out user
export type EmptyProfile = {}

// Non completed ref
export type StagedRef = {
  id?: string
  image?: ImagePickerAsset
  text?: string
  backlog?: boolean
  title?: string
  list?: boolean
}

// Non completed item
export type StagedItem = {
  ref: string
  image?: string
  text?: string
  backlog?: boolean
}

// Data types
export type CompleteRef = PBTypes.RefsRecord
export type Profile = PBTypes.UsersRecord
export type Item = PBTypes.ItemsRecord

export type GridTileType = 'add' | 'image' | 'text' | ''
