import { useItemStore } from '@/features/pocketbase'
import { ExpandedItem } from '@/features/pocketbase/stores/types'
import { useContext, useState } from 'react'
import { useStore } from 'zustand'
import { ProfileDetailsContext } from './profileDetailsStore'
import { useWindowDimensions, View } from 'react-native'
import { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { EditableItem } from './EditableItem'
import { s } from '@/features/style'
import { Sheet } from '@/ui/core/Sheets'
import { SearchRef } from '@/ui/actions/SearchRef'

export const DetailsCarouselItem = ({ item, index }: { item: ExpandedItem; index?: number }) => {
  const win = useWindowDimensions()

  const { searchingNewRef, updateEditedState, setSearchingNewRef, update } = useItemStore()
  const profileDetailsStore = useContext(ProfileDetailsContext)
  const { currentIndex } = useStore(profileDetailsStore)
  const [currentItem, setCurrentItem] = useState<ExpandedItem>(item)

  return (
    <View
      style={{
        width: win.width,
        height: win.height,
        gap: s.$1,
        justifyContent: 'flex-start',
      }}
      key={currentItem.id}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: s.$1 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        <EditableItem item={currentItem} index={index} />
      </BottomSheetScrollView>

      {searchingNewRef && currentIndex == index && (
        <Sheet
          keyboardShouldPersistTaps="always"
          onClose={() => {
            console.log('close')
            setSearchingNewRef('')
            // Do not update the ref
          }}
        >
          <SearchRef
            noNewRef
            onComplete={async (e) => {
              // Update the ref
              console.log(e.id)
              await updateEditedState({
                ref: e.id,
              })
              const newRecord = await update()
              setCurrentItem(newRecord as ExpandedItem)
              setSearchingNewRef('')
            }}
          />
        </Sheet>
      )}
    </View>
  )
}
