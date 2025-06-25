import { addToProfile, pocketbase, removeFromProfile, useUserStore } from '@/features/pocketbase'
import { getProfileItems, useItemStore } from '@/features/pocketbase/stores/items'
import { RefsRecord } from '@/features/pocketbase/stores/pocketbase-types'
import { ExpandedItem, StagedItemFields } from '@/features/pocketbase/stores/types'
import { c, s } from '@/features/style'
import { ChooseReplaceItemMethod } from '@/ui/actions/ChooseReplaceItemMethod'
import { RefForm } from '@/ui/actions/RefForm'
import { SelectItemToReplace } from '@/ui/actions/SelectItemToReplace'
import { useUIStore } from '@/ui/state'
import { Heading } from '@/ui/typo/Heading'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export const AddRefSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const { user } = useUserStore()
  const { addingRefId, setAddingRefId } = useUIStore()
  const [refData, setRefData] = useState<RefsRecord | null>(null)
  const [stagedItemFields, setStagedItemFields] = useState<StagedItemFields | null>(null)

  const { moveToBacklog } = useItemStore()

  useEffect(() => {
    const getRef = async () => {
      const ref = await pocketbase.collection<RefsRecord>('refs').getOne(addingRefId)
      setRefData(ref)
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
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)

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
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: s.$4, paddingTop: 0 }}
      onChange={(i: number) => {
        if (i === -1) {
          setRefData(null)
          setAddingRefId('')
          setItemToReplace(null)
          setStagedItemFields(null)
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
      {!refData || !user ? (
        <></>
      ) : step === 'editNewItem' ? (
        <View style={{ padding: s.$3 }}>
          <RefForm
            r={refData}
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
                await addToProfile(refData, fields, false)
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
            await addToProfile(refData, stagedItemFields, true)
            setStep('addedToBacklog')
          }}
        />
      ) : step === 'chooseReplaceItemMethod' && itemToReplace && stagedItemFields ? (
        <ChooseReplaceItemMethod
          itemToReplace={itemToReplace}
          removeFromProfile={async () => {
            // remove (delete) itemToReplace from the grid
            await removeFromProfile(itemToReplace.id)
            // add the new item to the grid
            await addToProfile(refData, stagedItemFields, false)
            setStep('addedToGrid')
          }}
          moveToBacklog={async () => {
            // send itemToReplace to the backlog
            await moveToBacklog(itemToReplace.id)
            // add the new item to the grid
            await addToProfile(refData, stagedItemFields, false)
            setStep('addedToGrid')
          }}
        />
      ) : step === 'addedToBacklog' ? (
        <View style={{ padding: s.$3 }}>
          <Heading tag="h1">{refData.title} was added to the backlog</Heading>
        </View>
      ) : step === 'addedToGrid' ? (
        <View style={{ padding: s.$3 }}>
          <Heading tag="h1">{refData.title} was added to grid</Heading>
        </View>
      ) : (
        <></>
      )}
    </BottomSheet>
  )
}
