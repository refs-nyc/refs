import { useUserStore, isProfile } from '@/features/pocketbase/stores/users'
import { Dimensions, View } from 'react-native'
import { useState, useEffect } from 'react'
import { RefForm } from '../actions/RefForm'
import { NewRefFields, SearchRef } from '../actions/SearchRef'
import { FilteredItems } from '../actions/FilteredItems'
import { ExpandedItem, StagedItemFields } from '@/features/pocketbase/stores/types'
import { EditableList } from '../lists/EditableList'
import { getProfileItems, useItemStore } from '@/features/pocketbase/stores/items'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import { s } from '@/features/style'
import { useRefStore } from '@/features/pocketbase/stores/refs'
import { RefsTypeOptions } from '@/features/pocketbase/stores/pocketbase-types'
import { pocketbase } from '@/features/pocketbase/pocketbase'
import { Heading } from '../typo/Heading'
import { addToProfile, removeFromProfile } from '@/features/pocketbase'
import { SelectItemToReplace } from './SelectItemToReplace'
import { ChooseReplaceItemMethod } from './ChooseReplaceItemMethod'

export type NewRefStep =
  | 'add'
  | 'search'
  | 'editList'
  | 'addToList'
  | 'selectItemToReplace'
  | 'chooseReplaceItemMethod'
  | 'addedToBacklog'
  | 'addedToGrid'

const win = Dimensions.get('window')

export const NewRef = ({
  onNewRef,
  onStep = () => {},
  onCancel,
  backlog = false,
}: {
  onNewRef: (itm: ExpandedItem) => void
  onStep: (step: string) => void
  onCancel: () => void
  backlog?: boolean
}) => {
  // functions for adding the new item to a list or the grid or the backlog
  const { push: pushRef } = useRefStore()
  const { addItemToList, push: pushItem, moveToBacklog } = useItemStore()
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

  useEffect(() => {
    onStep(step)
  }, [step])

  return (
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
            // if adding to grid, check if the grid is full
            if (!backlog) {
              // check if the grid is full
              const gridItems = await getProfileItems(user?.userName!)
              if (gridItems.length >= 12) {
                setStagedItemFields(itemFields)
                setStep('selectItemToReplace')
                return
              }
            }

            await addToProfile(existingRefId, itemFields, backlog)
            // finish the flow
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
            await removeFromProfile(itemToReplace.id)
            // add the new item to the grid
            const newItem = await addToProfile(existingRefId, stagedItemFields, false)
            setItemData(newItem)
            setStep('addedToGrid')
          }}
          moveToBacklog={async () => {
            // send itemToReplace to the backlog
            await moveToBacklog(itemToReplace.id)
            // add the new item to the grid
            const newItem = await addToProfile(existingRefId, stagedItemFields, false)
            setItemData(newItem)
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
            if (!isProfile(user) || !user.userName) {
              onCancel()
            } else {
              onNewRef(itemData)
            }
            setStep('search')
            setItemData(null)
          }}
        />
      )}

      {(step === 'addedToBacklog' || step === 'addedToGrid') && itemData && (
        <View style={{ padding: s.$3 }}>
          <Heading tag="h1">
            {itemData.expand.ref.title} was added to {itemData.backlog ? 'backlog' : 'grid'}
          </Heading>
        </View>
      )}
    </BottomSheetView>
  )
}
