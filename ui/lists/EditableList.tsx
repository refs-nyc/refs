import type { ExpandedItem, CompleteRef } from '@/features/pocketbase/stores/types'
import { BottomSheetView, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { Button } from '../buttons/Button'
import { t, c, s } from '@/features/style'
import { useRef, useState } from 'react'
import { Dimensions, Pressable, TextInput } from 'react-native'
import { SearchRef } from '../actions/SearchRef'
import { useRefStore } from '@/features/pocketbase/stores/refs'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { ListItem } from './ListItem'
import { NewListItemButton } from './NewListItemButton'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack } from '../core/Stacks'
import { Ionicons } from '@expo/vector-icons'

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
  const [title, setTitle] = useState<string>('')
  const [editingTitle, setEditingTitle] = useState<boolean>(true)
  const titleRef = useRef<TextInput>(null)
  const insets = useSafeAreaInsets()
  const win = Dimensions.get('window')

  const onTitleChange = async (e: string) => {
    titleRef.current?.blur()
    setEditingTitle(false)
    try {
      await updateOne(item.ref, {
        title: e,
      })
    } catch (error) {
      console.log(error)
    }
  }

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
        height: '90%',
        width: '100%',
        paddingVertical: s.$1,
      }}
    >
      <BottomSheetScrollView style={{ flex: 1, gap: s.$09 }}>
        <BottomSheetView>
          {/* Title */}
          <XStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <BottomSheetTextInput
              ref={titleRef}
              style={{
                ...t.h2,
                paddingVertical: s.$1,
                color: editingTitle ? c.grey2 : c.white,
              }}
              placeholder="Add a list title"
              value={title}
              onChangeText={(e) => setTitle(e)}
              onBlur={() => onTitleChange(title)}
              onFocus={() => setEditingTitle(true)}
            />
            {editingTitle && (
              <Pressable onPress={() => onTitleChange(title)}>
                <Ionicons name="checkbox-outline" size={s.$2} color={c.surface2} />
              </Pressable>
            )}
          </XStack>
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
                    backgroundColor={c.olive}
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
        onPress={onComplete}
        title="Done"
        variant="whiteInverted"
      ></Button>
    </BottomSheetView>
  )
}
