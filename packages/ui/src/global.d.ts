// src/types/global.d.ts
declare global {
  type Profile = {
    did: string
    firstName: string
    lastName: string
    userName: string
    location?: string
    geolocation?: string
    image?: string
    items?: string[]
  }

  // Non completed ref
  type StagedRef = {
    image?: string
    title?: string
  }

  // Stored ref
  type Ref = {
    id: number
    title: string
    createdAt: number
    firstReferral: string
    referrals: string[]
    image?: string
    location?: string
    deletedAt?: number
  }

  // Profile's copy of a ref
  type Item = {
    id: string
    ref: string // reference to a ref :halo:
    createdAt: number
    image?: string
    text?: string
    location?: string
    url?: string
    children?: RefsItem[]
    deletedAt?: number
  }
}

export {}
