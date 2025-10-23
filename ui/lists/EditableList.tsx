import type { ExpandedItem, CompleteRef } from '@/features/types'
import { BottomSheetView, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { Button } from '../buttons/Button'
import { t, c, s } from '@/features/style'
import { useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import { SearchRef } from '../actions/SearchRef'
import { useAppStore } from '@/features/stores'
import { getProfileItems } from '@/features/stores/items'
import { ListItem } from './ListItem'
import { NewListItemButton } from './NewListItemButton'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { XStack } from '../core/Stacks'
import { Ionicons } from '@expo/vector-icons'
import { clearActiveKeyboardInput, setActiveKeyboardInput } from '@/features/utils/keyboardFocusTracker'

export const EditableList = ({
  item,
  onComplete,
}: {
  item: ExpandedItem
  onComplete: () => void
}) => {
  const { isAddingToList, removeItem, setIsAddingToList, addToProfile, updateRefTitle, triggerProfileRefresh, user } =
    useAppStore()
  const [itemState, setItemState] = useState<ExpandedItem>(item)
  const [title, setTitle] = useState<string>(item.expand.ref.title || '')
  const [editingTitle, setEditingTitle] = useState<boolean>(!item.expand.ref.title)
  const titleRef = useRef<any>(null)
  const insets = useSafeAreaInsets()

  // Function to find the next available list number
  const getNextListNumber = async (): Promise<number> => {
    try {
      const gridItems = await getProfileItems({
        userName: user?.userName!,
        userId: user?.id,
      })
      const existingLists = gridItems.filter(item => item.list)
      const listNumbers = existingLists
        .map(item => {
          const title = item.expand?.ref?.title || ''
          const match = title.match(/^My List (\d+)$/)
          return match ? parseInt(match[1]) : 0
        })
        .filter(num => num > 0)
      
      if (listNumbers.length === 0) return 1
      return Math.max(...listNumbers) + 1
    } catch (error) {
      console.error('Error getting next list number:', error)
      return 1
    }
  }

  const onTitleChange = async (newTitle: string) => {
    titleRef.current?.blur()
    setEditingTitle(false)
    try {
      await updateRefTitle(item.ref, newTitle)
      // Trigger grid refresh to show the updated title
      triggerProfileRefresh()
    } catch (error) {
      console.error(error)
    }
  }

  const onRefFound = async (ref: CompleteRef) => {
    try {
      // use addToProfile instead
      const newItem = await addToProfile(
        ref.id,
        {
          parent: item.id,
          text: '',
          url: ref.url || '',
          image: ref.image || '',
        },
        false
      )
      setItemState((prev) => ({
        ...prev,
        expand: {
          ...prev.expand,
          items_via_parent: [...(prev.expand?.items_via_parent || []), newItem],
        },
      }))
      setIsAddingToList(false)
    } catch (error) {
    } finally {
      setIsAddingToList(false)
    }
  }

  return (
    <BottomSheetView
      style={{
        height: '90%',
        width: '100%',
        paddingVertical: s.$1,
        marginTop: -0,
      }}
    >
      <BottomSheetScrollView style={{ flex: 1, gap: s.$09, marginTop: -50 }}>
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
              onBlur={() => {
                clearActiveKeyboardInput('EditableList:title')
                onTitleChange(title)
              }}
              onFocus={() => {
                setEditingTitle(true)
                setActiveKeyboardInput('EditableList:title')
              }}
            />
            {editingTitle && (
              <Pressable onPress={() => onTitleChange(title)}>
                <Ionicons name="checkbox-outline" size={s.$2} color={c.surface2} />
              </Pressable>
            )}
          </XStack>
        </BottomSheetView>
        <BottomSheetView style={{ flex: 1 }}>
          {isAddingToList ? (
            <Pressable 
              style={{ flex: 1 }} 
              onPress={() => setIsAddingToList(false)}
            >
              <SearchRef 
                onChooseExistingRef={onRefFound} 
                onAddNewRef={() => {}} 
                noNewRef={true}
              />
            </Pressable>
          ) : (
            <BottomSheetView>
              <NewListItemButton onPress={() => setIsAddingToList(true)} />

              {itemState?.expand?.items_via_parent?.map((kid) => {
                return (
                  <ListItem
                    key={kid.id}
                    r={kid}
                    largeImage={true}
                    withRemove={true}
                    backgroundColor={c.olive}
                    titleColor={c.surface}
                    onRemove={async () => {
                      try {
                        await removeItem(kid.id)
                        setItemState((prev) => ({
                          ...prev,
                          expand: {
                            ...prev.expand,
                            items_via_parent:
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
          bottom: insets.bottom + 50,
          paddingHorizontal: 20,
        }}
      >
        <Button 
          onPress={async () => {
            // If title is empty, auto-generate a title
            if (!title.trim()) {
              const nextNumber = await getNextListNumber()
              const autoTitle = `My List ${nextNumber}`
              await updateRefTitle(item.ref, autoTitle)
            }
            onComplete()
          }} 
          title="Done" 
          variant="whiteInverted" 
        />
      </View>
    </BottomSheetView>
  )
}
