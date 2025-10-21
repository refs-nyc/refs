import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { Keyboard, View } from 'react-native'
import { useShareIntentContext } from 'expo-share-intent'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppStore } from '@/features/stores'
import { ExpandedItem, StagedItemFields } from '@/features/types'
import { getProfileItems } from '@/features/stores/items'
import { c, s } from '@/features/style'

import { RefForm } from '@/ui/actions/RefForm'
import { SearchRef, NewRefFields } from '@/ui/actions/SearchRef'
import { SelectItemToReplace } from '@/ui/actions/SelectItemToReplace'
import { ChooseReplaceItemMethod } from '@/ui/actions/ChooseReplaceItemMethod'
import { UserLists } from '@/ui/actions/UserLists'
import { EditableList } from '@/ui/lists/EditableList'

const SNAP_POINTS = ['80%'] as const
const DEFAULT_INDEX = 0
const GRID_CAPACITY = 12

type SheetStep =
  | 'search'
  | 'add'
  | 'selectReplace'
  | 'chooseReplaceMethod'
  | 'addToList'
  | 'editList'

export const NewRefSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef?: React.RefObject<BottomSheet>
}) => {
  const insets = useSafeAreaInsets()
  const { resetShareIntent } = useShareIntentContext()

  const { newRefSheetRef, newRefTarget, newRefPrompt, newRefPhoto, closeNewRef } = useAppStore()

  const sheetRef = bottomSheetRef ?? newRefSheetRef
  const isOpen = newRefTarget !== null
  const isBacklog = newRefTarget === 'backlog'

  const [step, setStep] = useState<SheetStep>('search')
  const [existingRefId, setExistingRefId] = useState<string | null>(null)
  const [refFields, setRefFields] = useState<NewRefFields | null>(null)
  const [stagedItemFields, setStagedItemFields] = useState<StagedItemFields | null>(null)
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)
  const [itemData, setItemData] = useState<ExpandedItem | null>(null)
  const [sheetIndex, setSheetIndex] = useState(-1)
  const [shouldRenderContent, setShouldRenderContent] = useState(isOpen)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  
  const isSheetActive = sheetIndex >= 0
  const hasOpenedRef = useRef(false)

  const resetState = useCallback(() => {
    setStep('search')
    setExistingRefId(null)
    setRefFields(null)
    setStagedItemFields(null)
    setItemToReplace(null)
    setItemData(null)
  }, [])

  const closeSheet = useCallback(() => {
    hasOpenedRef.current = false
    closeNewRef()
  }, [closeNewRef])

  // Keyboard listeners (matching AddRefSheet)
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

  // Prevent SearchRef (with autoFocus) from mounting during close animation
  useEffect(() => {
    if (isOpen) {
      // Immediately show content when opening
      setShouldRenderContent(true)
    } else {
      // Delay hiding content when closing to prevent autoFocus from triggering
      const timeout = setTimeout(() => setShouldRenderContent(false), 120)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  // Sync refFields and step with current props BEFORE first render
  useEffect(() => {
    if (isOpen && newRefPhoto) {
      setRefFields({
        title: newRefPrompt ?? '',
        image: newRefPhoto.uri,
        promptContext: newRefPrompt ?? undefined,
      })
      setStep('add')
    } else if (isOpen && !newRefPhoto) {
      setRefFields(null)
      setStep('search')
    }
  }, [isOpen, newRefPhoto, newRefPrompt])

  useEffect(() => {
    if (!isOpen) {
      hasOpenedRef.current = false
      Keyboard.dismiss()
      resetState()
      resetShareIntent?.()
      return
    }

    hasOpenedRef.current = true
  }, [isOpen, resetState, resetShareIntent])

  const addRefToProfile = useCallback(
    async (
      fields: StagedItemFields,
      options: { backlog: boolean; existingRefId: string | null },
      control?: { closeSheet?: boolean }
    ) => {
      const { addToProfile, showToast } = useAppStore.getState()
      const shouldCloseSheet = control?.closeSheet ?? true
      const promise = addToProfile(options.existingRefId, { ...fields }, options.backlog)
      if (shouldCloseSheet) {
        closeSheet()
      }
      try {
        const newItem = await promise
        setItemData(newItem)
        return newItem
      } catch (error) {
        console.error('Failed to add to profile', error)
        showToast?.('Could not save that ref. Please try again.')
        throw error
      }
    },
    [closeSheet]
  )

  const handleAddToExistingList = useCallback(
    async (listId: string, itemId: string) => {
      const { addItemToList, getItemById } = useAppStore.getState()
      await addItemToList(listId, itemId)
      const updated = await getItemById(listId)
      setItemData(updated)
      setStep('editList')
    },
    []
  )

  const handleCreateList = useCallback(
    async (nextNumber: number, itemId: string) => {
      const { addToProfile, getItemById, addItemToList } = useAppStore.getState()
      const list = await addToProfile(
        null,
        {
          title: `My List ${nextNumber}`,
          text: '',
          url: '',
          image: '',
          list: true,
        },
        false
      )
      await addItemToList(list.id, itemId)
      const expandedList = await getItemById(list.id)
      setItemData(expandedList)
      setStep('editList')
    },
    []
  )

  const onAddRef = useCallback(
    async (fields: StagedItemFields) => {
      if (!isBacklog) {
        const gridCount = useAppStore.getState().gridItemCount
        if (gridCount >= GRID_CAPACITY) {
          setStagedItemFields(fields)
          setStep('selectReplace')
          return
        }
      }
      try {
        await addRefToProfile(fields, { backlog: isBacklog, existingRefId })
      } catch {
        // toast already handled inside addRefToProfile
      }
    },
    [addRefToProfile, existingRefId, isBacklog]
  )

  const onAddPhototoList = useCallback(
    async (fields: StagedItemFields) => {
      try {
        await addRefToProfile(fields, { backlog: true, existingRefId }, { closeSheet: false })
        setStep('addToList')
      } catch {
        // toast already handled inside addRefToProfile
      }
    },
    [addRefToProfile, existingRefId]
  )

  const snapPoints = useMemo(() => {
    // Use 95% when showing RefForm with an image (photoPath=true prompts)
    if (step === 'add' && refFields?.image) {
      return ['95%']
    }
    return ['80%']
  }, [step, refFields?.image])

  return (
    <BottomSheet
      ref={sheetRef}
      index={isOpen ? DEFAULT_INDEX : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      handleComponent={null}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      style={{ zIndex: 10000 }}
      containerStyle={{ zIndex: 10000 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={DEFAULT_INDEX}
          pressBehavior="close"
        />
      )}
      onChange={(index) => {
        if (__DEV__) {
          console.log('[new-ref-sheet] onChange - sheetIndex:', index)
        }
        setSheetIndex(index)
        if (index < 0 && hasOpenedRef.current) {
          closeSheet()
        }
      }}
      onClose={() => {
        resetState()
        resetShareIntent?.()
      }}
    >
      <BottomSheetView
        style={{
          paddingTop: s.$2,
          paddingHorizontal: s.$2,
          paddingBottom: 0,
          gap: s.$1,
        }}
      >
        {shouldRenderContent && step === 'search' && (
          <SearchRef
            prompt={newRefPrompt ?? ''}
            onAddNewRef={(fields) => {
              setRefFields(fields)
              setStep('add')
            }}
            onChooseExistingRef={(ref, newImage) => {
              setExistingRefId(ref.id)
              setRefFields({ title: ref.title || '', image: newImage ?? ref.image, url: ref.url })
              setStep('add')
            }}
          />
        )}

        {shouldRenderContent && step === 'add' && refFields && (
          <View
            style={{
              marginTop: keyboardVisible ? (newRefPhoto ? -50 : -60) : 0,
            }}
          >
            <RefForm
              key={newRefPhoto?.uri ?? 'ref-form'}
              existingRefFields={refFields}
              placeholder="Title"
              canEditRefData
              backlog={isBacklog}
              onAddRef={onAddRef}
              onAddRefToList={onAddPhototoList}
              bottomInset={0}
              isSheetOpen={isSheetActive}
            />
          </View>
        )}

        {step === 'selectReplace' && stagedItemFields && (
          <SelectItemToReplace
            stagedItemFields={stagedItemFields}
            onSelectItemToReplace={(item) => {
              setItemToReplace(item)
              setStep('chooseReplaceMethod')
            }}
            onAddToBacklog={async () => {
              await onAddRef({ ...stagedItemFields, list: false })
            }}
          />
        )}

        {step === 'chooseReplaceMethod' && itemToReplace && stagedItemFields && (
          <ChooseReplaceItemMethod
            itemToReplace={itemToReplace}
            removeFromProfile={async () => {
              const { removeItem } = useAppStore.getState()
              await removeItem(itemToReplace.id)
              await onAddRef(stagedItemFields)
            }}
            moveToBacklog={async () => {
              const { moveToBacklog } = useAppStore.getState()
              await moveToBacklog(itemToReplace.id)
              await onAddRef(stagedItemFields)
            }}
          />
        )}

        {step === 'addToList' && itemData && (
          <View style={{ paddingVertical: s.$1, width: '100%' }}>
            <UserLists
              creatorId={useAppStore.getState().user?.id ?? ''}
              onComplete={async (list) => {
                await handleAddToExistingList(list.id, itemData.id)
              }}
              onCreateList={async () => {
                const user = useAppStore.getState().user
                if (!user) return
                const items: ExpandedItem[] = await getProfileItems({
                  userName: user.userName!,
                  userId: user.id,
                })
                const listNumbers = items
                  .filter((item) => item.list)
                  .map((item) => parseInt(item.expand?.ref?.title?.replace('My List ', '') ?? '0', 10))
                  .filter((n: number) => n > 0)
                const nextNumber = listNumbers.length ? Math.max(...listNumbers) + 1 : 1
                await handleCreateList(nextNumber, itemData.id)
              }}
            />
          </View>
        )}

        {step === 'editList' && itemData && <EditableList item={itemData} onComplete={closeSheet} />}
      </BottomSheetView>
    </BottomSheet>
  )
}
