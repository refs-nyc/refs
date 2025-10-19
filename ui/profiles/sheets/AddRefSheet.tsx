import { useAppStore } from '@/features/stores'
import { getProfileItems } from '@/features/stores/items'
import { ExpandedItem, StagedItemFields } from '@/features/types'
import { c, s } from '@/features/style'
import { AddedNewRefConfirmation } from '@/ui/actions/AddedNewRefConfirmation'
import { ChooseReplaceItemMethod } from '@/ui/actions/ChooseReplaceItemMethod'
import { RefForm } from '@/ui/actions/RefForm'
import { NewRefFields } from '@/ui/actions/SearchRef'
import { SelectItemToReplace } from '@/ui/actions/SelectItemToReplace'

import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Keyboard } from 'react-native'

export const AddRefSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  // fields from the ref that is being replaced, or a new ref that is going to be added

  const [refFields, setRefFields] = useState<NewRefFields | null>(null)

  // the item fields
  const [stagedItemFields, setStagedItemFields] = useState<StagedItemFields | null>(null)

  // if applicable, the item that is being replaced
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)

  // the resulting item
  const [itemData, setItemData] = useState<ExpandedItem | null>(null)

  const {
    user,
    moveToBacklog,
    removeItem,
    addToProfile,
    getRefById,
    addingRefId,
    setAddingRefId,
    addingRefPrefill,
    setAddingRefPrefill,
    moduleBackdropAnimatedIndex,
    registerBackdropPress,
    unregisterBackdropPress,
  } =
    useAppStore()

  const [sheetIndex, setSheetIndex] = useState(-1)
  const isSheetActive = sheetIndex >= 0
  const backdropKeyRef = useRef<string | null>(null)

  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const handleShow = (event: any) => {
      setKeyboardVisible(true)
      setKeyboardHeight(event?.endCoordinates?.height ?? 0)
    }
    const handleHide = () => {
      setKeyboardVisible(false)
      setKeyboardHeight(0)
    }

    const subs = [
      Keyboard.addListener('keyboardWillShow', handleShow),
      Keyboard.addListener('keyboardDidShow', handleShow),
      Keyboard.addListener('keyboardWillHide', handleHide),
      Keyboard.addListener('keyboardDidHide', handleHide),
    ]

    return () => subs.forEach((sub) => sub.remove())
  }, [])

  useEffect(() => {
    if (addingRefId && addingRefPrefill) {
      setRefFields({ ...addingRefPrefill })
    }
  }, [addingRefId, addingRefPrefill])

  useEffect(() => {
    if (!addingRefId) {
      setRefFields(null)
      setSheetIndex(-1)
      if (moduleBackdropAnimatedIndex) {
        moduleBackdropAnimatedIndex.value = -1
      }
      return
    }
    setSheetIndex(0)
    if (moduleBackdropAnimatedIndex) {
      moduleBackdropAnimatedIndex.value = 0
    }

    let cancelled = false
    ;(async () => {
      try {
        const ref = await getRefById(addingRefId)
        if (cancelled) return
        setRefFields({
          title: ref.title!,
          image: ref.image,
          url: ref.url,
        })
      } catch (error) {
        if (__DEV__) console.warn('Failed to preload ref data for AddRefSheet', { addingRefId, error })
      }
    })()

    return () => {
      cancelled = true
      if (moduleBackdropAnimatedIndex) {
        moduleBackdropAnimatedIndex.value = -1
      }
      setAddingRefPrefill(null)
    }
  }, [addingRefId, getRefById, moduleBackdropAnimatedIndex, setAddingRefPrefill])

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
      ? '69%'
      : '30%'
  const snapPoint = keyboardVisible ? '100%' : sheetHeight

  const disappearsOnIndex = -1
  const appearsOnIndex = 0
  const HANDLE_HEIGHT = s.$2

  const resetSheetState = useCallback(() => {
    Keyboard.dismiss()
    setKeyboardVisible(false)
    setKeyboardHeight(0)
    setRefFields(null)
    setAddingRefPrefill(null)
    setItemToReplace(null)
    setStagedItemFields(null)
    setItemData(null)
    setStep('editNewItem')
    if (moduleBackdropAnimatedIndex) {
      moduleBackdropAnimatedIndex.value = -1
    }
    if (backdropKeyRef.current) {
      unregisterBackdropPress(backdropKeyRef.current)
      backdropKeyRef.current = null
    }
    setAddingRefId('')
  }, [moduleBackdropAnimatedIndex, unregisterBackdropPress, setAddingRefId, setAddingRefPrefill])

  const closeSheet = useCallback(() => {
    if (sheetIndex === -1) {
      return
    }
    setAddingRefId('')
    if (moduleBackdropAnimatedIndex) {
      moduleBackdropAnimatedIndex.value = -1
    }
    bottomSheetRef.current?.close()
    setSheetIndex(-1)
  }, [bottomSheetRef, moduleBackdropAnimatedIndex, setAddingRefId, sheetIndex])

  const prevSheetIndexRef = useRef(sheetIndex)

  useEffect(() => {
    if (sheetIndex === -1 && prevSheetIndexRef.current !== -1) {
      resetSheetState()
    }
    prevSheetIndexRef.current = sheetIndex
  }, [resetSheetState, sheetIndex])

  useEffect(() => {
    if (!isSheetActive) {
      if (backdropKeyRef.current) {
        unregisterBackdropPress(backdropKeyRef.current)
        backdropKeyRef.current = null
      }
      return
    }

    const key = registerBackdropPress(() => {
      closeSheet()
    })
    backdropKeyRef.current = key

    return () => {
      unregisterBackdropPress(key)
      if (backdropKeyRef.current === key) {
        backdropKeyRef.current = null
      }
    }
  }, [closeSheet, isSheetActive, registerBackdropPress, unregisterBackdropPress])

  useEffect(() => {
    return () => {
      resetSheetState()
    }
  }, [resetSheetState])

  const containerZIndex = isSheetActive ? 10000 : 0

  return (
    <View
      pointerEvents={isSheetActive ? 'auto' : 'none'}
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: containerZIndex }}
    >
      <BottomSheet
        enableDynamicSizing={false}
        ref={bottomSheetRef}
        enablePanDownToClose={true}
        snapPoints={[snapPoint]}
        index={sheetIndex}
        style={{ flex: 1 }}
        containerStyle={{ zIndex: containerZIndex }}
        animatedIndex={moduleBackdropAnimatedIndex}
        backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
        onChange={(i: number) => {
          setSheetIndex(i)
        }}
        onClose={closeSheet}
        backdropComponent={(p) => (
          <BottomSheetBackdrop
            {...p}
            disappearsOnIndex={disappearsOnIndex}
            appearsOnIndex={appearsOnIndex}
            pressBehavior={'close'}
          />
        )}
        handleComponent={null}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      {!refFields || !user ? (
        <></>
      ) : step === 'editNewItem' ? (
        <View
          style={{
            paddingHorizontal: s.$3,
            paddingTop: (s.$3 as number) - 12,
            minHeight: '100%',
            marginTop: keyboardVisible ? -40 : 0,
          }}
        >
          <RefForm
            existingRefFields={refFields}
            canEditRefData={false}
            onAddRefToList={async (fields) => {}}
            onAddRef={async (fields) => {
              // check if the grid is full
              const gridItems = await getProfileItems({
                userName: user.userName,
                userId: user.id,
              })
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
            bottomInset={keyboardVisible ? keyboardHeight + 84 : 0}
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
    </View>
  )
}
