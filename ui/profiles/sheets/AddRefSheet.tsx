import { pocketbase } from '@/features/pocketbase'
import { useAppStore } from '@/features/stores'
import { getProfileItems } from '@/features/stores/items'
import { RefsRecord } from '@/features/pocketbase/pocketbase-types'
import { ExpandedItem, StagedItemFields } from '@/features/pocketbase/types'
import { c, s } from '@/features/style'
import { AddedNewRefConfirmation } from '@/ui/actions/AddedNewRefConfirmation'
import { ChooseReplaceItemMethod } from '@/ui/actions/ChooseReplaceItemMethod'
import { RefForm } from '@/ui/actions/RefForm'
import { NewRefFields } from '@/ui/actions/SearchRef'
import { SelectItemToReplace } from '@/ui/actions/SelectItemToReplace'
import { useUIStore } from '@/ui/state'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const AddRefSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const { addingRefId, setAddingRefId } = useUIStore()

  // fields from the ref that is being replaced, or a new ref that is going to be added

  const [refFields, setRefFields] = useState<NewRefFields | null>(null)

  // the item fields
  const [stagedItemFields, setStagedItemFields] = useState<StagedItemFields | null>(null)

  // if applicable, the item that is being replaced
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)

  // the resulting item
  const [itemData, setItemData] = useState<ExpandedItem | null>(null)

  const { user, moveToBacklog, removeItem, addToProfile } = useAppStore()

  useEffect(() => {
    const getRef = async () => {
      const ref = await pocketbase.collection<RefsRecord>('refs').getOne(addingRefId)
      setRefFields({
        title: ref.title!,
        image: ref.image,
        url: ref.url,
      })
    }
    getRef()
  }, [addingRefId])

  const [step, setStep] = useState<
    | 'editNewItem'
    | 'selectItemToReplace'
    | 'addedToBacklog'
    | 'addedToGrid'
    | 'chooseReplaceItemMethod'
  >('editNewItem')

  const sheetHeight =
    step === 'selectItemToReplace'
      ? '90%'
      : step === 'chooseReplaceItemMethod'
      ? '50%'
      : step === 'editNewItem'
      ? '90%'
      : '30%'

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={[sheetHeight]}
      index={-1}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      onChange={(i: number) => {
        if (i === -1) {
          setRefFields(null)
          setAddingRefId('')
          setItemToReplace(null)
          setStagedItemFields(null)
          setItemData(null)
          setStep('editNewItem')
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
      handleComponent={null}
      keyboardBehavior="interactive"
    >
      {!refFields || !user ? (
        <></>
      ) : step === 'editNewItem' ? (
        <View style={{ padding: s.$3, paddingTop: s.$3 + 8 }}>
          <RefForm
            existingRefFields={refFields}
            canEditRefData={false}
            onAddRefToList={async (fields) => {}}
            onAddRef={async (fields) => {
              // check if the grid is full
              const gridItems = await getProfileItems(user.userName)
              if (gridItems && gridItems.length >= 12) {
                // show a modal to the user that the grid is full
                setStagedItemFields(fields)
                setStep('selectItemToReplace')
              } else {
                const newItem = await addToProfile(addingRefId, fields, false)
                setItemData(newItem)
                setStep('addedToGrid')
              }
            }}
            backlog={false}
          />
        </View>
      ) : step === 'selectItemToReplace' && stagedItemFields ? (
        <SelectItemToReplace
          stagedItemFields={stagedItemFields}
          onSelectItemToReplace={(item) => {
            setItemToReplace(item)
            setStep('chooseReplaceItemMethod')
          }}
          onAddToBacklog={async () => {
            const newItem = await addToProfile(addingRefId, stagedItemFields, true)
            setItemData(newItem)
            setStep('addedToBacklog')
          }}
        />
      ) : step === 'chooseReplaceItemMethod' && itemToReplace && stagedItemFields ? (
        <ChooseReplaceItemMethod
          itemToReplace={itemToReplace}
          removeFromProfile={async () => {
            // remove (delete) itemToReplace from the grid
            await removeItem(itemToReplace.id)
            // add the new item to the grid
            const newItem = await addToProfile(addingRefId, stagedItemFields, false)
            setItemData(newItem)
            setStep('addedToGrid')
          }}
          moveToBacklog={async () => {
            // send itemToReplace to the backlog
            await moveToBacklog(itemToReplace.id)
            // add the new item to the grid
            const newItem = await addToProfile(addingRefId, stagedItemFields, false)
            setItemData(newItem)
            setStep('addedToGrid')
          }}
        />
      ) : (step === 'addedToBacklog' || step === 'addedToGrid') && itemData ? (
        <AddedNewRefConfirmation itemData={itemData} />
      ) : (
        <></>
      )}
    </BottomSheet>
  )
}
