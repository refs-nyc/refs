import type { ExpandedItem, CompleteRef } from '@/features/pocketbase/stores/types'
import { BottomSheetView, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { Button } from '../buttons/Button'
import { t, c, s } from '@/features/style'
import { useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { SearchRef } from '../actions/SearchRef'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { ListItem } from './ListItem'
import { NewListItemButton } from './NewListItemButton'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack } from '../core/Stacks'
import { Ionicons } from '@expo/vector-icons'
import { pocketbase } from '@/features/pocketbase'

export const EditableList = ({
  item,
  onComplete,
}: {
  item: ExpandedItem
  onComplete: () => void
}) => {
  const { addingToList, remove, setAddingToList } = useItemStore()
  const { push, updateOneRef } = useItemStore()
  const [itemState, setItemState] = useState<ExpandedItem>(item)
  const [title, setTitle] = useState<string>(item.expand.ref.title || '')
  const [editingTitle, setEditingTitle] = useState<boolean>(!item.expand.ref.title)
  const titleRef = useRef<any>(null)
  const insets = useSafeAreaInsets()

  const onTitleChange = async (e: string) => {
    titleRef.current?.blur()
    setEditingTitle(false)
    try {
      await updateOneRef(item.ref, {
        title: e,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const onRefFound = async (ref: CompleteRef) => {
    try {
      const newItem = await push({
        ref: ref.id,
        image: ref?.image,
        creator: pocketbase.authStore?.record?.id,
        parent: item.id,
      })
      setItemState((prev) => ({
        ...prev,
        expand: {
          ...prev.expand,
          items_via_parent: [...(prev.expand?.items_via_parent || []), newItem],
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
                color: c.surface,
              }}
              placeholder="Add a list title"
              placeholderTextColor={c.surface}
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
<<<<<<< Updated upstream
            <SearchRef onChooseExistingRef={onRefFound} onAddNewRef={() => {}} noNewRef={true} />
=======
            <SearchRef autoFocus={true} onComplete={onRefFound} noNewRef={true} />
>>>>>>> Stashed changes
          ) : (
            <BottomSheetView>
              <NewListItemButton onPress={() => setAddingToList(true)} />

              {itemState?.expand?.items_via_parent?.map((kid) => {
                return (
                  <ListItem
                    key={kid.id}
                    r={kid}
                    largeImage={true}
                    withRemove={true}
                    backgroundColor={c.olive}
                    onRemove={async () => {
                      try {
                        await remove(kid.id)
                        setItemState((prev) => ({
                          ...prev,
                          expand: {
                            ...prev.expand,
                            children:
                              prev.expand?.items_via_parent?.filter((e) => e.id !== kid.id) || [],
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
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + 10,
          paddingHorizontal: 20,
        }}
      >
        <Button onPress={onComplete} title="Done" variant="whiteInverted" />
      </View>
    </BottomSheetView>
  )
}
