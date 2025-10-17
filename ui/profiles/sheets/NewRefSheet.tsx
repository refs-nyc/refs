import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet'
import { Keyboard, View, InteractionManager } from 'react-native'
import { useShareIntentContext } from 'expo-share-intent'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAppStore } from '@/features/stores'
import { ExpandedItem, StagedItemFields, Profile } from '@/features/types'
import { c, s } from '@/features/style'

import { RefForm } from '@/ui/actions/RefForm'
import { SearchRef, NewRefFields } from '@/ui/actions/SearchRef'
import { SelectItemToReplace } from '@/ui/actions/SelectItemToReplace'
import { ChooseReplaceItemMethod } from '@/ui/actions/ChooseReplaceItemMethod'
import { UserLists } from '@/ui/actions/UserLists'
import { EditableList } from '@/ui/lists/EditableList'
import { persistBacklogSnapshot, persistGridSnapshot, getProfileCacheEntryByUserId } from '@/features/cache/profileCache'
import { gridSort } from '@/features/stores/itemFormatters'
import { markProfileGridDirty } from '@/features/stores/items'


const SNAP_POINTS = ['80%'] as const
const DEFAULT_INDEX = 0

const scheduleAfterInteractions = (task: () => void) => {
  try {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(task)
    })
  } catch {
    setTimeout(task, 0)
  }
}

const clampIndex = (value: number) => {
  if (value < 0) return -1
  const max = SNAP_POINTS.length - 1
  return Math.min(Math.max(value, 0), max)
}

const useNewRefSheetController = () => {
  const {
    addingNewRefTo,
    setAddingNewRefTo,
    newRefSheetRef,
    addRefPrompt,
    setAddRefPrompt,
    triggerProfileRefresh,
    triggerFeedRefresh,
    optimisticItems,
    addOptimisticItem,
    removeOptimisticItem,
  } = useAppStore()

  const { resetShareIntent } = useShareIntentContext()

  const isOpen = addingNewRefTo !== null
  const isBacklog = addingNewRefTo === 'backlog'

  const [step, setStep] = useState<'search' | 'add' | 'selectReplace' | 'chooseReplaceMethod' | 'addToList' | 'editList'>('search')
  const [existingRefId, setExistingRefId] = useState<string | null>(null)
  const [refFields, setRefFields] = useState<NewRefFields | null>(null)
  const [stagedItemFields, setStagedItemFields] = useState<StagedItemFields | null>(null)
  const [itemToReplace, setItemToReplace] = useState<ExpandedItem | null>(null)
  const [itemData, setItemData] = useState<ExpandedItem | null>(null)
  const [captionFocused, setCaptionFocused] = useState(false)
  const [shouldRenderContent, setShouldRenderContent] = useState(false)
  const [shouldMount, setShouldMount] = useState(false)
  const [sheetIndex, setSheetIndex] = useState(-1)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isClosingRef = useRef(false)

  const desiredIndex = useMemo(() => {
    if (!isOpen) return -1
    return SNAP_POINTS.length - 1
  }, [isOpen])

  const resetState = useCallback(() => {
    setStep('search')
    setExistingRefId(null)
    setRefFields(null)
    setStagedItemFields(null)
    setItemToReplace(null)
    setItemData(null)
    setCaptionFocused(false)
  }, [])

  const persistOptimisticSnapshot = useCallback(async (item: ExpandedItem, backlogTarget: boolean) => {
    try {
      const { user } = useAppStore.getState()
      if (!user?.id) return
      const cacheEntry = getProfileCacheEntryByUserId(user.id)
      const resolvedProfile: Profile | undefined = cacheEntry?.profile ?? (user as Profile | undefined)

      if (!backlogTarget) {
        const base = cacheEntry?.gridItems ?? []
        const filtered = base.filter((existing) => existing.id !== item.id)
        const next = gridSort([...filtered, item])
        await persistGridSnapshot({
          userId: user.id,
          userName: user.userName,
          gridItems: next,
          profile: resolvedProfile,
          backlogItems: cacheEntry?.backlogItems,
        })
        markProfileGridDirty(user.id)
      } else {
        const base = cacheEntry?.backlogItems ?? []
        const filtered = base.filter((existing) => existing.id !== item.id)
        const next = [...filtered, item]
        await persistBacklogSnapshot({
          userId: user.id,
          userName: user.userName,
          backlogItems: next,
          profile: resolvedProfile,
          gridItems: cacheEntry?.gridItems,
        })
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('[new-ref] persist optimistic snapshot failed', error)
      }
    }
  }, [])


  const finalizeClose = useCallback(() => {
    resetState()
    resetShareIntent?.()
    setAddRefPrompt('')
    setShouldRenderContent(false)
    setAddingNewRefTo(null)
    Keyboard.dismiss()
    isClosingRef.current = false
  }, [resetState, resetShareIntent, setAddRefPrompt, setAddingNewRefTo])

  const closeSheet = useCallback(
    (options?: { immediate?: boolean; reason?: 'submit' | 'cancel' }) => {
      if (isClosingRef.current) return
      isClosingRef.current = true
      const dropSheet = () => {
        if (options?.reason === 'submit') {
          newRefSheetRef.current?.close()
        } else {
          newRefSheetRef.current?.close()
        }
      }

      if (options?.reason === 'submit') {
        setTimeout(dropSheet, 80)
        return
      }

      dropSheet()
    },
    [newRefSheetRef]
  )

  useEffect(() => {
    const targetIndex = clampIndex(desiredIndex < 0 ? SNAP_POINTS.length - 1 : desiredIndex)

    if (isOpen) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
      setShouldMount(true)
      isClosingRef.current = false
      scheduleAfterInteractions(() => {
        requestAnimationFrame(() => {
          setSheetIndex(targetIndex)
          setShouldRenderContent(true)
        })
      })
      return
    }

    setShouldRenderContent(false)
    setSheetIndex(-1)
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    closeTimeoutRef.current = setTimeout(() => {
      setShouldMount(false)
      closeTimeoutRef.current = null
    }, 220)
  }, [desiredIndex, isOpen, scheduleAfterInteractions])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
    }
  }, [])

  const handleSheetChange = useCallback(
    (index: number) => {
      const clamped = clampIndex(index)
      setSheetIndex(clamped)
      if (clamped >= 0) {
        setShouldRenderContent(true)
      }
    },
    []
  )

  const handleAddToProfile = useCallback(
    async (fields: StagedItemFields, options: { backlog: boolean; existingRefId: string | null }) => {
      const { backlog } = options
      const merged = { ...fields }
      const { addToProfile, replaceOptimisticItem } = useAppStore.getState()

      const optimistic: ExpandedItem = {
        id: `temp-${Date.now()}`,
        collectionId: 'items',
        collectionName: 'items',
        creator: useAppStore.getState().user?.id ?? '',
        ref: options.existingRefId ?? 'temp-ref',
        image: fields.image ?? '',
        url: fields.url ?? '',
        text: fields.text ?? '',
        list: fields.list ?? false,
        parent: fields.parent ?? '',
        backlog,
        order: 0,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        promptContext: fields.promptContext ?? '',
        expand: {
          ref: {
            id: options.existingRefId ?? 'temp-ref',
            title: fields.title ?? '',
            image: fields.image ?? '',
            url: fields.url ?? '',
            meta: '{}',
            creator: useAppStore.getState().user?.id ?? '',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          },
          creator: null as any,
          items_via_parent: [] as any,
        },
      }

      addOptimisticItem(optimistic)
      void persistOptimisticSnapshot(optimistic, backlog)
      closeSheet({ reason: 'submit' })

      try {
        const newItem = await addToProfile(options.existingRefId, merged, backlog)
        replaceOptimisticItem(optimistic.id, newItem)
        setItemData(newItem)
        void persistOptimisticSnapshot(newItem, backlog)
      } catch (error) {
        console.error('Failed to add to profile', error)
        removeOptimisticItem(optimistic.id)
      }
    },
    [addOptimisticItem, closeSheet, removeOptimisticItem]
  )

  const handleAddToExistingList = useCallback(
    async (listId: string, itemId: string) => {
      const { addItemToList } = useAppStore.getState()
      await addItemToList(listId, itemId)
      const { getItemById } = useAppStore.getState()
      const updated = await getItemById(listId)
      setItemData(updated)
      setStep('editList')
    },
    []
  )

  const handleCreateList = useCallback(
    async (nextNumber: number, itemId: string) => {
      const { addToProfile, getItemById } = useAppStore.getState()
      const list = await addToProfile(null, {
        title: `My List ${nextNumber}`,
        text: '',
        url: '',
        image: '',
        list: true,
      }, false)
      await useAppStore.getState().addItemToList(list.id, itemId)
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
        if (gridCount >= 12) {
          setStagedItemFields(fields)
          setStep('selectReplace')
          return
        }
      }
      await handleAddToProfile(fields, { backlog: isBacklog, existingRefId: existingRefId })
    },
    [existingRefId, handleAddToProfile, isBacklog]
  )

  const onAddPhototoList = useCallback(
    async (fields: StagedItemFields) => {
      await handleAddToProfile(fields, { backlog: true, existingRefId: existingRefId })
      setStep('addToList')
    },
    [existingRefId, handleAddToProfile]
  )

  return {
    isOpen,
    isBacklog,
    step,
    setStep,
    existingRefId,
    setExistingRefId,
    refFields,
    setRefFields,
    stagedItemFields,
    setStagedItemFields,
    itemToReplace,
    setItemToReplace,
    itemData,
    setItemData,
    captionFocused,
    setCaptionFocused,
    shouldRenderContent,
    shouldMount,
    sheetIndex,
    handleSheetChange,
    handleAddToProfile,
    handleAddToExistingList,
    handleCreateList,
    onAddRef,
    onAddPhototoList,
    closeSheet,
    finalizeClose,
    newRefSheetRef,
    addRefPrompt,
    setAddRefPrompt,
    triggerProfileRefresh,
    triggerFeedRefresh,
    scheduleAfterInteractions,
  }
}

export const NewRefSheet = () => {
  const insets = useSafeAreaInsets()

  const {
    isOpen,
    isBacklog,
    step,
    setStep,
    existingRefId,
    setExistingRefId,
    refFields,
    setRefFields,
    stagedItemFields,
    setStagedItemFields,
    itemToReplace,
    setItemToReplace,
    itemData,
    setItemData,
    captionFocused,
    setCaptionFocused,
    shouldRenderContent,
    shouldMount,
    sheetIndex,
    handleSheetChange,
    handleAddToProfile,
    handleAddToExistingList,
    handleCreateList,
    onAddRef,
    onAddPhototoList,
    closeSheet,
    finalizeClose,
    newRefSheetRef,
    addRefPrompt,
    setAddRefPrompt,
    triggerProfileRefresh,
    triggerFeedRefresh,
    scheduleAfterInteractions,
  } = useNewRefSheetController()

  const snapPoints = useMemo(() => [...SNAP_POINTS], [])

  useEffect(() => {
    if (!isOpen) return
    scheduleAfterInteractions(() => {
      triggerProfileRefresh()
      triggerFeedRefresh()
    })
  }, [isOpen, scheduleAfterInteractions, triggerFeedRefresh, triggerProfileRefresh])

  if (!shouldMount) return null

  return (
    <BottomSheet
      ref={newRefSheetRef}
      index={sheetIndex}
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
      onChange={handleSheetChange}
      onClose={finalizeClose}
    >
      {shouldRenderContent && (
        <BottomSheetView
          style={{
            paddingTop: s.$2,
            paddingHorizontal: s.$2,
            paddingBottom: insets.bottom ? insets.bottom + s.$075 : s.$2,
            gap: s.$1,
          }}
        >
          {step === 'search' && (
            <SearchRef
              prompt={addRefPrompt}
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

          {step === 'add' && refFields && (
            <RefForm
              existingRefFields={refFields}
              placeholder="Title"
              onCaptionFocus={setCaptionFocused}
              onCaptionBlur={() => setCaptionFocused(false)}
              canEditRefData
              backlog={isBacklog}
              onAddRef={onAddRef}
              onAddRefToList={onAddPhototoList}
            />
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
        closeSheet()
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
                  const { getProfileItems } = useAppStore.getState()
                  const items = await getProfileItems({ userName: useAppStore.getState().user?.userName!, userId: useAppStore.getState().user?.id })
                  const listNumbers = items
                    .filter((item) => item.list)
                    .map((item) => parseInt(item.expand?.ref?.title?.replace('My List ', '') ?? '0', 10))
                    .filter((n) => n > 0)
                  const nextNumber = listNumbers.length ? Math.max(...listNumbers) + 1 : 1
                  await handleCreateList(nextNumber, itemData.id)
                }}
              />
            </View>
          )}

          {step === 'editList' && itemData && (
            <EditableList item={itemData} onComplete={closeSheet} />
          )}
        </BottomSheetView>
      )}
    </BottomSheet>
  )
}
