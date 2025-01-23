import { ImagePickerAsset } from 'expo-image-picker'

import * as PBTypes from './pocketbase-types'

// Logged out user
export type EmptyProfile = {}

export type StagedRef = Partial<PBTypes.RefsRecord>
export type StagedItem = Partial<PBTypes.ItemsRecord>

export type CompleteRef = PBTypes.RefsRecord
export type Profile = PBTypes.UsersRecord
export type Item = PBTypes.ItemsRecord

export type GridTileType = 'add' | 'image' | 'text' | ''
