import { SearchOrAddRef } from '../actions/SearchOrAddRef'
import { useItemStore } from '@/features/pocketbase/stores/items'
// import { View } from 'react-native'
import type { Item, CompleteRef } from '@/features/pocketbase/stores/types'

export const EditableList = ({ item, onComplete }: { item: Item; onComplete: () => void }) => {
  const { addToList } = useItemStore()

  return (
    <SearchOrAddRef
      noNewRef
      onComplete={async (ref: CompleteRef) => {
        const record = await addToList(item.id, ref)
        onComplete && onComplete()
      }}
    />
  )
}
