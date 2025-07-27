import { addToProfile, pocketbase, useUserStore } from '@/features/pocketbase'
import { getProfileItems, useItemStore } from '@/features/pocketbase/stores/items'
import { RefsTypeOptions } from '@/features/pocketbase/stores/pocketbase-types'
import { ExpandedItem, StagedItemFields } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { AddedNewRefConfirmation } from '@/ui/actions/AddedNewRefConfirmation'
import { ChooseReplaceItemMethod } from '@/ui/actions/ChooseReplaceItemMethod'
import { FilteredItems } from '@/ui/actions/FilteredItems'
import { RefForm } from '@/ui/actions/RefForm'
import { NewRefFields, SearchRef } from '@/ui/actions/SearchRef'
import { SelectItemToReplace } from '@/ui/actions/SelectItemToReplace'
import { EditableList } from '@/ui/lists/EditableList'
import { useUIStore } from '@/ui/state'
import { useBackdropStore } from '@/features/pocketbase/stores/backdrop'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Platform, Keyboard } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { SheetHandle } from '@/ui/core/SheetHandle'

export type NewRefStep =
  | 'search'
  | 'add'
  | 'addToList'
  | 'editList'
  | 'chooseReplaceItemMethod'
  | 'selectItemToReplace'
  | 'addedToBacklog'
  | 'addedToGrid'

export const NewRefSheet = ({
  bottomSheetRef,
  handleCreateNewRef,
  onClose,
  promptText = '',
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
  handleCreateNewRef: (itm: ExpandedItem) => Promise<void>
  onClose: () => void
  promptText?: string
}) => {
  const { triggerProfileRefresh } = useItemStore()
  const { addingNewRefTo, setAddingNewRefTo, addRefPrompt } = useUIStore()
  const { headerBackdropAnimatedIndex } = useBackdropStore()

  const renderBackdrop = useCallback(
    (p: any) => (
      <BottomSheetBackdrop 
        {...p} 
        disappearsOnIndex={-1} 
        appearsOnIndex={0} 
        pressBehavior="close"
      />
    ),
    []
  )

  // functions for adding the new item to a list or the grid or the backlog
  const { addItemToList, push: pushItem, pushRef, moveToBacklog, remove } = useItemStore()
  const { user } = useUserStore()

  const [step, setStep] = useState<NewRefStep>('search')

  // fields from the ref that is being replaced, or a new ref that is going to be added
  const [existingRefId, setExistingRefId] = useState<string | null>(null)
  const [refFields, setRefFields] = useState<NewRefFields | null>(null)

  // the item fields
  const [stagedItemFields, setStagedItemFields] = useState<StagedItemFields | null>(null)

  // if applicable, the item that is being replaced
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)

  // the resulting item
  const [itemData, setItemData] = useState<ExpandedItem | null>(null)

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  const isOpen = addingNewRefTo !== null

  const backlog = addingNewRefTo === 'backlog'

  // Two snap points: collapsed and expanded
  const snapPoints = ['50%', '90%']
  // Track if the sheet is open
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Track keyboard state
  useEffect(() => {
    const keyboardDidShow = () => {
      if (isSheetOpen) bottomSheetRef.current?.snapToIndex(1)
    }
    const keyboardDidHide = () => {
      if (isSheetOpen) bottomSheetRef.current?.snapToIndex(0)
    }
    const showSub = Keyboard.addListener('keyboardDidShow', keyboardDidShow)
    const hideSub = Keyboard.addListener('keyboardDidHide', keyboardDidHide)
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [bottomSheetRef, isSheetOpen])

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={snapPoints}
      index={-1}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      backdropComponent={renderBackdrop}
      onChange={(i: number) => {
        setIsSheetOpen(i !== -1)
        if (i === -1) {
          Keyboard.dismiss()
          setAddingNewRefTo(null)
          setStep('search')
          setItemData(null)
          setStagedItemFields(null)
          setItemToReplace(null)
          setExistingRefId(null)
          setRefFields(null)
        }
      }}
      handleComponent={null}
      animatedIndex={headerBackdropAnimatedIndex}
      keyboardBehavior="interactive"
    >
      {isOpen && (
        <>
          {step === 'search' && (
            <SearchRef
              prompt={addRefPrompt}
              onAddNewRef={(fields) => {
                setRefFields(fields)
                setStep('add')
              }}
              onChooseExistingRef={(r, newImage) => {
                setExistingRefId(r.id)
                setRefFields({ title: r.title!, image: newImage, url: r.url })
                setStep('add')
              }}
            />
          )}

          {step === 'add' && (
            <RefForm
              existingRefFields={refFields}
              pickerOpen={false}
              canEditRefData={true}
              onAddRef={async (itemFields) => {
                // Merge promptContext from refFields if present
                const mergedFields = { ...itemFields, promptContext: refFields?.promptContext }
                if (!backlog) {
                  // check if the grid is full
                  const gridItems = await getProfileItems(user?.userName!)
                  if (gridItems.length >= 12) {
                    setStagedItemFields(mergedFields)
                    setStep('selectItemToReplace')
                    return
                  }
                }

                const newItem = await addToProfile(existingRefId, mergedFields, backlog)
                setItemData(newItem)
                // finish the flow
                triggerProfileRefresh()
                setStep('addedToGrid')
              }}
              onAddRefToList={async (itemFields) => {
                const mergedFields = { ...itemFields, promptContext: refFields?.promptContext }
                const newItem = await addToProfile(existingRefId, mergedFields, backlog)
                setItemData(newItem)
                setStep('addToList')
              }}
              backlog={backlog}
            />
          )}

          {step === 'selectItemToReplace' && stagedItemFields && (
            <SelectItemToReplace
              stagedItemFields={stagedItemFields}
              onSelectItemToReplace={(item) => {
                setItemToReplace(item)
                setStep('chooseReplaceItemMethod')
              }}
              onAddToBacklog={async () => {
                const newItem = await addToProfile(existingRefId, stagedItemFields, true)
                setItemData(newItem)
                setStep('addedToBacklog')
              }}
            />
          )}

          {step === 'chooseReplaceItemMethod' && itemToReplace && stagedItemFields && (
            <ChooseReplaceItemMethod
              itemToReplace={itemToReplace}
              removeFromProfile={async () => {
                // remove (delete) itemToReplace from the grid
                await remove(itemToReplace.id)
                // add the new item to the grid
                const newItem = await addToProfile(existingRefId, stagedItemFields, false)
                setItemData(newItem)
                triggerProfileRefresh()
                setStep('addedToGrid')
              }}
              moveToBacklog={async () => {
                // send itemToReplace to the backlog
                await moveToBacklog(itemToReplace.id)
                // add the new item to the grid
                const newItem = await addToProfile(existingRefId, stagedItemFields, false)
                setItemData(newItem)
                triggerProfileRefresh()
                setStep('addedToGrid')
              }}
            />
          )}

          {step === 'addToList' && (
            <View style={{ paddingVertical: s.$1, width: '100%' }}>
              <FilteredItems
                filter={`list = true && creator = "${user?.id}"`}
                onComplete={async (list) => {
                  // Add the item to the list
                  await addItemToList(list.id, itemData?.id!)

                  // Fetch fresh data after adding
                  const updatedItem = await pocketbase
                    .collection('items')
                    .getOne<ExpandedItem>(list.id, {
                      expand: 'ref,items_via_parent,items_via_parent.ref',
                    })
                  setItemData(updatedItem)
                  setStep('editList')
                }}
                onCreateList={async () => {
                  // Create new ref for the list
                  const listRef = await pushRef({
                    title: '',
                    type: RefsTypeOptions.other,
                    creator: user?.id,
                  })

                  // Create new item with the ref
                  const list = await pushItem({
                    ref: listRef.id,
                    creator: user?.id,
                    list: true,
                  })

                  // Add current item to the new list
                  await addItemToList(list.id, itemData?.id!)

                  // Fetch the expanded list data
                  const expandedList = await pocketbase
                    .collection('items')
                    .getOne<ExpandedItem>(list.id, {
                      expand: 'ref,items_via_parent,items_via_parent.ref',
                    })

                  // Set the expanded item as current and show edit list
                  setItemData(expandedList)
                  setStep('editList')
                }}
              />
            </View>
          )}

          {step === 'editList' && itemData && (
            <EditableList
              item={itemData}
              onComplete={() => {
                bottomSheetRef.current?.close()
              }}
            />
          )}

          {(step === 'addedToBacklog' || step === 'addedToGrid') && itemData && (
            <AddedNewRefConfirmation itemData={itemData} />
          )}
        </>
      )}
    </BottomSheet>
  )
}
