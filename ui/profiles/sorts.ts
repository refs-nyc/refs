import type { Item } from '@/features/pocketbase/stores/types'

export const createdSort = (a: Item, b: Item) => {
  return new Date(a.created as string).valueOf() - new Date(b.created as string).valueOf()
}

export const gridSort = (a: Item, b: Item) => {
  // Items with order get their exact position (0-11)
  if (a.order !== 0 && b.order !== 0) {
    return (a.order ?? 0) - (b.order ?? 0)
  }
  // Items with order always come before items without
  if (a.order !== undefined) return -1
  if (b.order !== undefined) return 1
  // For items without order, sort by creation date
  return new Date(a.created as string).valueOf() - new Date(b.created as string).valueOf()
}
