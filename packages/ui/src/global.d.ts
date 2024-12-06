// src/types/global.d.ts
declare global {
  // Stored ref
  type RefsItem = {
    id: string
    title: string
    text?: string
    image?: string
    location?: string
    url?: string
    children?: RefsItem[]
    createdAt: number
    deletedAt?: number
  }

  // Non completed ref
  type StagedRef = {
    image?: string
    title?: string
  }
}

export {}
