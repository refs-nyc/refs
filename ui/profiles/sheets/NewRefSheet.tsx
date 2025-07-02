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
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

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
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const { triggerProfileRefresh } = useItemStore()
  const { addingNewRefTo, setAddingNewRefTo } = useUIStore()

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

  const sheetHeight =
    step === 'search'
      ? '50%'
      : step === 'add'
      ? '90%'
      : step === 'addToList'
      ? '50%'
      : step === 'editList'
      ? '90%'
      : step === 'addedToBacklog' || step === 'addedToGrid'
      ? '30%'
      : '30%'

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={[sheetHeight]}
      index={-1}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      onChange={(i: number) => {
        if (i === -1) {
          setAddingNewRefTo(null)
          setStep('search')
          setItemData(null)
          setStagedItemFields(null)
          setItemToReplace(null)
          setExistingRefId(null)
          setRefFields(null)
        }
      }}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      handleComponent={() => (
        <View
          style={{
            width: '100%',
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            height: HANDLE_HEIGHT,
          }}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={{
              backgroundColor: c.white,
              width: s.$5,
              height: s.$05,
              borderRadius: s.$10,
            }}
          />
        </View>
      )}
      keyboardBehavior="interactive"
    >
      {isOpen && (
        <BottomSheetView
          style={{
            paddingHorizontal: s.$2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {step === 'search' && (
            <SearchRef
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
                if (!backlog) {
                  // check if the grid is full
                  const gridItems = await getProfileItems(user?.userName!)
                  if (gridItems.length >= 12) {
                    setStagedItemFields(itemFields)
                    setStep('selectItemToReplace')
                    return
                  }
                }

                const newItem = await addToProfile(existingRefId, itemFields, backlog)
                setItemData(newItem)
                // finish the flow
                triggerProfileRefresh()
                setStep('addedToGrid')
              }}
              onAddRefToList={async (itemFields) => {
                const newItem = await addToProfile(existingRefId, itemFields, backlog)
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
                    creator: user?.id!,
                  })

                  // Create new item with the ref
                  const list = await pushItem(
                    listRef.id,
                    {
                      list: true,
                      text: '',
                      url: '',
                      image: '',
                    },
                    false
                  )

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
        </BottomSheetView>
      )}
    </BottomSheet>
  )
}
