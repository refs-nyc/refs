import { SearchOrAddRef } from '../actions/SearchOrAddRef'
import { useItemStore } from '@/features/pocketbase/stores/items'
import type { Item, CompleteRef } from '@/features/pocketbase/stores/types'

export const EditableList = ({ item }: { item: Item }) => {
  const { addToList } = useItemStore()

  return (
    <SearchOrAddRef
      onComplete={async (ref: CompleteRef) => {
        const record = await addToList(item.id, ref)
        console.log(record)
      }}
    />
  )
}
