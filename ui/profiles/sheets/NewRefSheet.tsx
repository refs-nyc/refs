import { getProfileItems } from '@/features/stores/items'
import { ExpandedItem, StagedItemFields } from '@/features/types'
import { useAppStore } from '@/features/stores'
import { c, s } from '@/features/style'
import { AddedNewRefConfirmation } from '@/ui/actions/AddedNewRefConfirmation'
import { ChooseReplaceItemMethod } from '@/ui/actions/ChooseReplaceItemMethod'
import { UserLists } from '@/ui/actions/UserLists'
import { RefForm } from '@/ui/actions/RefForm'
import { NewRefFields, SearchRef } from '@/ui/actions/SearchRef'
import { SelectItemToReplace } from '@/ui/actions/SelectItemToReplace'
import { EditableList } from '@/ui/lists/EditableList'

import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { useEffect, useMemo, useState } from 'react'
import { Keyboard, View } from 'react-native'
import { Collections } from '@/features/pocketbase/pocketbase-types'

export type NewRefStep =
  | 'search'
  | 'add'
  | 'addToList'
  | 'editList'
  | 'chooseReplaceItemMethod'
  | 'selectItemToReplace'
  | 'addedToBacklog'
  | 'addedToGrid'

const SNAP_INDICES = {
  closed: -1,
  default: 0, // 67%
  search: 1, // 80%
  add: 2, // 85%
  expanded: 3, // 100%
  caption: 4, // 110%
}

const snapPoints = ['67%', '80%', '85%', '100%', '110%']
const maxSnapIndex = snapPoints.length - 1

export const NewRefSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  const {
    triggerProfileRefresh,
    addItemToList,
    moveToBacklog,
    removeItem,
    addToProfile,
    user,
    getItemById,
    addingNewRefTo,
    setAddingNewRefTo,
    addRefPrompt,
  } = useAppStore()

  const [step, setStep] = useState<NewRefStep>('search')
  const [existingRefId, setExistingRefId] = useState<string | null>(null)
  const [refFields, setRefFields] = useState<NewRefFields | null>(null)
  const [stagedItemFields, setStagedItemFields] = useState<StagedItemFields | null>(null)
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)
  const [itemData, setItemData] = useState<ExpandedItem | null>(null)
  const [sheetIndex, setSheetIndex] = useState<number>(SNAP_INDICES.closed)
  const [shouldRenderContent, setShouldRenderContent] = useState<boolean>(false)
  const [shouldMountSheet, setShouldMountSheet] = useState<boolean>(false)
  const [captionFocused, setCaptionFocused] = useState<boolean>(false)

  const isOpen = addingNewRefTo !== null
  const backlog = addingNewRefTo === 'backlog'

  const getNextListNumber = async (): Promise<number> => {
    try {
      const gridItems = await getProfileItems(user?.userName!)
      const existingLists = gridItems.filter(item => item.list)
      const listNumbers = existingLists
        .map(item => {
          const title = item.expand?.ref?.title || ''
          const match = title.match(/^My List (\d+)$/)
          return match ? parseInt(match[1]) : 0
        })
        .filter(num => num > 0)

      if (listNumbers.length === 0) {
        return 1
      }

      return Math.max(...listNumbers) + 1
    } catch (error) {
      console.error('Error getting next list number:', error)
      return 1
    }
  }

  const desiredIndex = useMemo(() => {
    if (!isOpen) {
      return SNAP_INDICES.closed
    }

    if (step === 'add') {
      return captionFocused ? SNAP_INDICES.caption : SNAP_INDICES.add
    }

    return SNAP_INDICES.search
  }, [isOpen, step, captionFocused])

  useEffect(() => {
    if (isOpen) {
      setShouldMountSheet(true)
      setShouldRenderContent(true)
      return
    }

    setShouldRenderContent(false)
    const timer = setTimeout(() => {
      setShouldMountSheet(false)
      setSheetIndex(SNAP_INDICES.closed)
    }, 220)

    return () => clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const clamped = Math.min(Math.max(desiredIndex, SNAP_INDICES.closed), maxSnapIndex)
    if (sheetIndex !== clamped) {
      setSheetIndex(clamped)
    }
  }, [isOpen, desiredIndex, sheetIndex])

  useEffect(() => {
    if (step !== 'add' && captionFocused) {
      setCaptionFocused(false)
    }
  }, [step, captionFocused])

  // Handle photo prompts - use selectedPhoto from store if available
  useEffect(() => {
    if (isOpen && addRefPrompt) {
      const photoPrompts = ['Piece from a museum', 'Tradition you love', 'Meme', 'halloween pic']

      if (photoPrompts.includes(addRefPrompt)) {
        const { selectedPhoto } = useAppStore.getState()

        if (selectedPhoto) {
          setRefFields({
            title: '',
            image: selectedPhoto,
            url: '',
            promptContext: addRefPrompt,
          })
          setStep('add')
          useAppStore.getState().setSelectedPhoto(null)
        }
      }
    }
  }, [isOpen, addRefPrompt])

  const resetSheetState = () => {
    setCaptionFocused(false)
    setStep('search')
    setItemData(null)
    setStagedItemFields(null)
    setItemToReplace(null)
    setExistingRefId(null)
    setRefFields(null)
  }

  const handleClose = () => {
    setAddingNewRefTo(null)
    setSheetIndex(SNAP_INDICES.closed)
    bottomSheetRef.current?.close()
    Keyboard.dismiss()
    resetSheetState()
  }

  useEffect(() => {
    if (isOpen) {
      setShouldRenderContent(true)
      return
    }

    const timer = setTimeout(() => {
      setShouldRenderContent(false)
    }, 220)

    return () => clearTimeout(timer)
  }, [isOpen])

  if (!shouldMountSheet) {
    return null
  }

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={snapPoints}
      index={sheetIndex}
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      onChange={(index: number) => {
        const clamped = Math.min(Math.max(index, SNAP_INDICES.closed), maxSnapIndex)
        if (clamped !== sheetIndex) {
          setSheetIndex(clamped)
        }

        if (clamped === SNAP_INDICES.closed) {
          handleClose()
        }
      }}
      handleComponent={null}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={SNAP_INDICES.closed}
          appearsOnIndex={SNAP_INDICES.default}
          pressBehavior={'close'}
        />
      )}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
    >
      {shouldRenderContent && (
        <BottomSheetView
          style={{
            paddingHorizontal: s.$2,
            paddingTop: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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
              key={`ref-form-${refFields?.image || 'no-image'}-${addRefPrompt || 'no-prompt'}`}
              existingRefFields={refFields}
              placeholder={'Title'}
              pickerOpen={false}
              canEditRefData={true}
              onCaptionFocus={setCaptionFocused}

              onAddRef={async (itemFields) => {
                const mergedFields = { ...itemFields, promptContext: refFields?.promptContext }

                if (!backlog) {
                  const { gridItemCount } = useAppStore.getState()
                  if (gridItemCount >= 12) {
                    setStagedItemFields(mergedFields)
                    setStep('selectItemToReplace')
                    return
                  }
                }

                const optimisticItem: ExpandedItem = {
                  id: `temp-${Date.now()}`,
                  collectionId: Collections.Items,
                  collectionName: Collections.Items,
                  creator: user?.id || '',
                  ref: existingRefId || 'temp-ref',
                  image: itemFields.image || '',
                  url: itemFields.url || '',
                  text: itemFields.text || '',
                  list: itemFields.list || false,
                  parent: itemFields.parent || '',
                  backlog,
                  order: 0,
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  promptContext: mergedFields.promptContext || '',
                  expand: {
                    ref: {
                      id: existingRefId || 'temp-ref',
                      title: itemFields.title || '',
                      image: itemFields.image || '',
                      url: itemFields.url || '',
                      meta: '{}',
                      creator: user?.id || '',
                      created: new Date().toISOString(),
                      updated: new Date().toISOString(),
                    },
                    creator: null as any,
                    items_via_parent: [] as any,
                  },
                }

                const { addOptimisticItem } = useAppStore.getState()
                addOptimisticItem(optimisticItem)

                Keyboard.dismiss()
                handleClose()

                ;(async () => {
                  try {
                    const newItem = await addToProfile(existingRefId, mergedFields, backlog)
                    setItemData(newItem)
                  } catch (error) {
                    console.error('Failed to add item to profile:', error)
                    const { removeOptimisticItem } = useAppStore.getState()
                    removeOptimisticItem(optimisticItem.id)
                  }
                })()
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
                triggerProfileRefresh()
                setStep('addedToBacklog')
              }}
            />
          )}

          {step === 'chooseReplaceItemMethod' && itemToReplace && stagedItemFields && (
            <ChooseReplaceItemMethod
              itemToReplace={itemToReplace}
              removeFromProfile={async () => {
                await removeItem(itemToReplace.id)
                const newItem = await addToProfile(existingRefId, stagedItemFields, false)
                setItemData(newItem)
                triggerProfileRefresh()
                setStep('addedToGrid')
              }}
              moveToBacklog={async () => {
                await moveToBacklog(itemToReplace.id)
                const newItem = await addToProfile(existingRefId, stagedItemFields, false)
                setItemData(newItem)
                triggerProfileRefresh()
                setStep('addedToGrid')
              }}
            />
          )}

          {step === 'addToList' && (
            <View style={{ paddingVertical: s.$1, width: '100%' }}>
              <UserLists
                creatorId={user?.id!}
                onComplete={async (list: ExpandedItem) => {
                  await addItemToList(list.id, itemData?.id!)
                  const updatedItem = await getItemById(list.id)
                  setItemData(updatedItem)
                  setStep('editList')
                }}
                onCreateList={async () => {
                  const nextNumber = await getNextListNumber()

                  const list = await addToProfile(
                    null,
                    {
                      title: `My List ${nextNumber}`,
                      text: '',
                      url: '',
                      image: '',
                      list: true,
                    },
                    false,
                  )

                  await addItemToList(list.id, itemData?.id!)
                  const expandedList = await getItemById(list.id)
                  setItemData(expandedList)
                  setStep('editList')
                  triggerProfileRefresh()
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
