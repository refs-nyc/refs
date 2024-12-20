import { ImagePickerAsset } from "expo-image-picker"

// Logged in user profile
export type Profile = {
  did: string
  firstName: string
  lastName: string
  userName: string
  location?: string
  geolocation?: string
  image?: string
  items?: string[]
}

// Logged out user
export type EmptyProfile = {}

// Non completed ref
export type StagedRef = {
  id?: string
  image?: ImagePickerAsset
  backlog?: boolean
  title?: string
}

// Stored ref
export type CompleteRef = {
  id: number
  title: string
  createdAt: number
  firstReferral?: string
  referrals: string[]
  image?: string
  location?: string
  deletedAt?: number
}

// Non completed item
export type StagedItem = {
  ref: string
  image?: string
}

// Profile's copy of a ref
export type Item = {
  id: string
  ref: string // reference to a ref :halo:
  createdAt: number
  image?: string
  text?: string
  location?: string
  url?: string
  children?: Item[]
  deletedAt?: number
}

export type GridTileType = 'add' | 'image' | 'text' | ''

