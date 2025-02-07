import { useState } from 'react'
import { SearchRef } from '../actions/SearchRef'
import { NewRef } from '../actions/NewRef'
import { View } from 'react-native'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { s } from '@/features/style'
import type { Item, CompleteRef } from '@/features/pocketbase/stores/types'
import { DismissKeyboard } from '../atoms/DismissKeyboard'

export const EditableList = ({ item, onComplete }: { item: Item; onComplete: () => void }) => {
  const [initialRefData, setInitialRefData] = useState({})
  const { addToList } = useItemStore()

  return (
    <View style={{ flex: 1 }}>
      {JSON.stringify(initialRefData) !== '{}' ? (
        <NewRef
          initialRefData={initialRefData}
          initialStep={'add'}
          onCancel={() => {}}
          onNewRef={async (ref: CompleteRef) => {
            const record = await addToList(item.id, ref)
            onComplete()
          }}
        />
      ) : (
        <View style={{ flex: 1, paddingBottom: s.$2 }}>
          <SearchRef
            onComplete={async (ref: CompleteRef) => {
              if (!ref.id) {
                setInitialRefData(ref)
              } else {
                const record = await addToList(item.id, ref)
                onComplete && onComplete(record)
              }
            }}
          />
        </View>
      )}
    </View>
  )
}
