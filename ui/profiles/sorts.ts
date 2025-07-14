import type { Item } from '@/features/types'

export const createdSort = (a: Item, b: Item) => {
  return new Date(a.created as string).valueOf() - new Date(b.created as string).valueOf()
}
