import { createdSort } from '@/ui/profiles/sorts'
import type { ExpandedItem } from '@/features/types'

export const gridSort = (items: ExpandedItem[]): ExpandedItem[] => {
  const itemsWithOrder: ExpandedItem[] = []
  const itemsWithoutOrder: ExpandedItem[] = []

  for (const item of items) {
    if (item.order !== 0) {
      itemsWithOrder.push(item)
    } else {
      itemsWithoutOrder.push(item)
    }
  }

  itemsWithOrder.sort((a, b) => a.order - b.order)
  itemsWithoutOrder.sort(createdSort)
  return [...itemsWithOrder, ...itemsWithoutOrder]
}

export const compactGridItem = (item: ExpandedItem): ExpandedItem => {
  const ref = item.expand?.ref
  if (!ref) {
    return item
  }

  const compactRef = {
    ...ref,
    subtitle: (ref as any)?.subtitle ?? undefined,
    link: (ref as any)?.link ?? undefined,
    caption: (ref as any)?.caption ?? undefined,
  }

  return {
    ...item,
    expand: {
      ...item.expand,
      ref: compactRef,
    } as ExpandedItem['expand'],
  }
}

