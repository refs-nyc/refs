import type { ExpandedItem, CompleteRef } from '@/features/pocketbase/stores/types'
import { BottomSheetView, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { EditableHeader } from '../atoms/EditableHeader'
import { Button } from '../buttons/Button'
import { t, c, base, s } from '@/features/style'
import { useEffect, useState } from 'react'
import { Dimensions } from 'react-native'
import { SearchRef } from '../actions/SearchRef'
import { useRefStore } from '@/features/pocketbase/stores/refs'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { ListItem } from './ListItem'
import { NewListItemButton } from './NewListItemButton'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export const EditableList = ({
  item,
  onComplete,
}: {
  item: ExpandedItem
  onComplete: () => void
}) => {
  const { addingToList, addToList, removeFromList, setAddingToList } = useItemStore()
  const { updateOne } = useRefStore()
  const [itemState, setItemState] = useState<ExpandedItem>(item)
  const insets = useSafeAreaInsets()
  const win = Dimensions.get('window')

  const onRefFound = async (ref: CompleteRef) => {
    try {
      const itm = await addToList(item.id, ref)
      setItemState((prev) => ({
        ...prev,
        expand: {
          ...prev.expand,
          children: [...(prev.expand?.children || []), ref],
        },
      }))
      setAddingToList(false)
    } catch (error) {
    } finally {
      setAddingToList(false)
    }
  }

  return (
    <BottomSheetView
      style={{
        height: win.height - insets.top - insets.bottom - 20,
      }}
    >
      <BottomSheetScrollView style={{ flex: 1, gap: s.$09 }}>
        <BottomSheetView>
          {/* Title */}
          <EditableHeader
            withUrl={false}
            onTitleChange={async (e) => {
              try {
                const rec = await updateOne(item.ref, {
                  title: e,
                })
              } catch (error) {}
            }}
            onDataChange={() => {}}
            placeholder={'Add a list title'}
            title={item.expand?.ref?.title || ''}
            url=""
          />
        </BottomSheetView>
        <BottomSheetView style={{ flex: 1 }}>
          {addingToList ? (
            <SearchRef onComplete={onRefFound} noNewRef={true} />
          ) : (
            <BottomSheetView>
              <NewListItemButton onPress={() => setAddingToList(true)} />

              {itemState?.expand?.children?.map((kid, index) => {
                return (
                  <ListItem
                    key={kid.id + index}
                    r={kid}
                    largeImage={true}
                    withRemove={true}
                    onRemove={async () => {
                      try {
                        await removeFromList(item.id, kid)
                        setItemState((prev) => ({
                          ...prev,
                          expand: {
                            ...prev.expand,
                            children: prev.expand?.children?.filter((e) => e.id !== kid.id) || [],
                          },
                        }))
                      } catch (error) {}
                    }}
                  />
                )
              })}
            </BottomSheetView>
          )}
        </BottomSheetView>
      </BottomSheetScrollView>
      <Button
        style={{ position: 'absolute', bottom: 0, width: '100%' }}
        onPress={onComplete}
        title="Done"
        variant="raised"
      ></Button>
    </BottomSheetView>
  )
}
