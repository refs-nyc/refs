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
import { useState, useEffect, useRef } from 'react'
import { View, Platform, Keyboard, Dimensions } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
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

export const NewRefSheet = ({
  bottomSheetRef,
}: {
  bottomSheetRef: React.RefObject<BottomSheet>
}) => {
  // functions for adding the new item to a list or the grid or the backlog
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

  // Function to find the next available list number
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
      
      if (listNumbers.length === 0) return 1
      return Math.max(...listNumbers) + 1
    } catch (error) {
      console.error('Error getting next list number:', error)
      return 1
    }
  }

  // Adjust snap points to reduce visible "duck" when switching content
  const snapPoints = ['67%', '80%', '85%', '100%', '110%']
  // Track if the sheet is open
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  // Track current sheet index to prevent redundant snap animations
  const [sheetIndex, setSheetIndex] = useState<number>(-1)
  
  // Track caption focus for keyboard handling
  const [captionFocused, setCaptionFocused] = useState<boolean>(false)
  // Track if this is a photo prompt to prevent auto-snapping to 100%
  const [photoPromptActive, setPhotoPromptActive] = useState<boolean>(false)
  // Track if keyboard is being dismissed to prevent other snap effects
  const [keyboardDismissing, setKeyboardDismissing] = useState<boolean>(false)
  // Track if we're manually handling a transition to prevent keyboard hide conflicts
  const [manualTransition, setManualTransition] = useState<boolean>(false)

  // Track keyboard state
  useEffect(() => {
    const keyboardDidShow = () => {
      // Don't snap again if already at the right height
      if (!isSheetOpen) return

      // During search step, always show at 80% (index 1)
      if (step === 'search') {
        requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(1)) // 80%
        return
      }

      // For add step, only snap if caption is focused (to 110%), otherwise let the add step effect handle it
      if (step === 'add' && captionFocused) {
        const targetIndex = 4 // 110%
        if (sheetIndex === targetIndex) return
        requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(targetIndex))
      }
    }
    const keyboardDidHide = () => {
      if (!isSheetOpen) return
      
      // Don't run if we're manually handling a transition
      if (manualTransition) {
        console.log('🔽 KEYBOARD HIDE - Blocked by manualTransition flag')
        return
      }
      
      console.log('🔽 KEYBOARD HIDE - Setting keyboardDismissing=true')
      // Set flag to prevent other snap effects
      setKeyboardDismissing(true)
      
      // Reset caption focus state when keyboard is dismissed
      if (captionFocused) {
        console.log('🔽 KEYBOARD HIDE - Resetting captionFocused to false')
        setCaptionFocused(false)
      }
      
      // When keyboard is dismissed, snap directly to 67% (default position)
      console.log('🔽 KEYBOARD HIDE - Snapping to index 0 (67%)')
      requestAnimationFrame(() => {
        bottomSheetRef.current?.snapToIndex(0) // 67%
      })
      
      // Clear the flag after a delay
      setTimeout(() => {
        console.log('🔽 KEYBOARD HIDE - Clearing keyboardDismissing flag')
        setKeyboardDismissing(false)
      }, 200)
    }
    const showSub = Keyboard.addListener('keyboardDidShow', keyboardDidShow)
    const hideSub = Keyboard.addListener('keyboardDidHide', keyboardDidHide)
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [bottomSheetRef, isSheetOpen, sheetIndex, captionFocused, photoPromptActive, step, manualTransition])

  // When transitioning to the add step (e.g., after selecting from camera roll),
  // ensure the sheet is visible at 85% immediately, independent of keyboard events.
  useEffect(() => {
    if (!isSheetOpen) return
    if (keyboardDismissing) {
      console.log('🚫 ADD STEP EFFECT - Blocked by keyboardDismissing flag')
      return // Don't run when keyboard is being dismissed
    }
    if (step === 'add') {
      // Don't snap to 85% if caption is focused - let caption focus effect handle it
      if (captionFocused) return
      // Don't snap to 85% if we're at 67% (keyboard dismissed)
      if (sheetIndex === 0) return
      // Don't snap to 85% if we're not in a state where we should be at 85%
      // Only snap to 85% when initially opening the add step
      if (sheetIndex !== -1) return
      console.log('📊 ADD STEP EFFECT - Snapping to index 2 (85%)')
      requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(2)) // 85%
    }
  }, [step, isSheetOpen, bottomSheetRef, captionFocused, sheetIndex, keyboardDismissing])

  // Safety: whenever we are NOT on the add step, guarantee caption-focused state is false
  // so search or other steps never adopt caption behavior.
  useEffect(() => {
    if (step !== 'add' && captionFocused) {
      setCaptionFocused(false)
    }
  }, [step, captionFocused])

  // React to caption focus changes directly. Only snap to 110% when caption becomes focused
  useEffect(() => {
    if (!isSheetOpen) return
    if (keyboardDismissing) {
      console.log('🚫 CAPTION FOCUS EFFECT - Blocked by keyboardDismissing flag')
      return // Don't run when keyboard is being dismissed
    }
    if (step !== 'add') return
    if (!captionFocused) return // Only run when caption becomes focused, not when it loses focus
    
    console.log('📝 CAPTION FOCUS EFFECT - Snapping to index 4 (110%)')
    // Snap to 110% when caption is focused
    requestAnimationFrame(() =>
      bottomSheetRef.current?.snapToIndex(4) // 110%
    )
  }, [captionFocused, step, isSheetOpen, bottomSheetRef, sheetIndex, keyboardDismissing])

  // Handle photo prompts - use selectedPhoto from store if available
  useEffect(() => {
    if (isOpen && addRefPrompt) {
      // Check if this is a photo prompt
      const photoPrompts = ['Piece from a museum', 'Tradition you love', 'Meme', 'halloween pic']
      
      if (photoPrompts.includes(addRefPrompt)) {
        // Check if photo is already available from MyProfile
        const { selectedPhoto } = useAppStore.getState()
        
        if (selectedPhoto) {
          // Photo was already selected in MyProfile - use it directly
          setPhotoPromptActive(true)
          setRefFields({ 
            title: '', 
            image: selectedPhoto, 
            url: '',
            promptContext: addRefPrompt 
          })
          setStep('add')
          useAppStore.getState().setSelectedPhoto(null)
          
          // Open at 85% (index 2) for photo prompts to match add-step behavior
          setTimeout(() => {
            bottomSheetRef.current?.snapToIndex(2)
          }, 50)
        } else {
          // Photo not available yet - wait for it
          const checkForPhoto = () => {
            const { selectedPhoto: currentPhoto } = useAppStore.getState()
            if (currentPhoto) {
              setPhotoPromptActive(true)
              setRefFields({ 
                title: '', 
                image: currentPhoto, 
                url: '',
                promptContext: addRefPrompt 
              })
              setStep('add')
              useAppStore.getState().setSelectedPhoto(null)
              
              setTimeout(() => {
                bottomSheetRef.current?.snapToIndex(2)
              }, 50)
            } else {
              // Check again in 50ms
              setTimeout(checkForPhoto, 50)
            }
          }
          checkForPhoto()
        }
      }
    }
  }, [isOpen, addRefPrompt])

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={snapPoints}
      index={-1}
      keyboardBehavior="interactive"
      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      onChange={(i: number) => {
        setIsSheetOpen(i !== -1)
        setSheetIndex(i)
        if (i === -1) {
          Keyboard.dismiss()
          setAddingNewRefTo(null)
          setStep('search')
          setItemData(null)
          setStagedItemFields(null)
          setItemToReplace(null)
          setExistingRefId(null)
          setRefFields(null)
          setPhotoPromptActive(false)
        }
      }}
      handleComponent={null}
      backdropComponent={(p) => (
        <BottomSheetBackdrop
          {...p}
          disappearsOnIndex={disappearsOnIndex}
          appearsOnIndex={appearsOnIndex}
          pressBehavior={'close'}
        />
      )}
      // keyboardBehavior="interactive"
    >
      {isOpen && (
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
              placeholder={'Add a title'}
              pickerOpen={false}
              canEditRefData={true}
              onCaptionFocus={(focused) => {
                setCaptionFocused(focused)
                // If caption loses focus, immediately snap to 67%
                if (!focused) {
                  console.log('📝 CAPTION BLUR - Immediately snapping to 67%')
                  setManualTransition(true)
                  requestAnimationFrame(() => {
                    bottomSheetRef.current?.snapToIndex(0) // 67%
                    // Clear manual transition flag after a longer delay to ensure keyboard hide completes
                    setTimeout(() => {
                      setManualTransition(false)
                    }, 300)
                  })
                }
              }}
              onManualTransition={() => {
                console.log('🔄 MANUAL TRANSITION - Setting flag and snapping to 67%')
                setManualTransition(true)
                requestAnimationFrame(() => {
                  bottomSheetRef.current?.snapToIndex(0) // 67%
                  // Clear manual transition flag after a longer delay to ensure keyboard hide completes
                  setTimeout(() => {
                    setManualTransition(false)
                  }, 300)
                })
              }}
              onAddRef={async (itemFields) => {
                // Merge promptContext from refFields if present
                const mergedFields = { ...itemFields, promptContext: refFields?.promptContext }
                
                if (!backlog) {
                  // Use cached grid count instead of database query
                  const { gridItemCount } = useAppStore.getState()
                  if (gridItemCount >= 12) {
                    setStagedItemFields(mergedFields)
                    setStep('selectItemToReplace')
                    return
                  }
                }

                // Create optimistic item immediately
                const optimisticItem: ExpandedItem = {
                  id: `temp-${Date.now()}`, collectionId: Collections.Items, collectionName: Collections.Items,
                  creator: user?.id || '', ref: existingRefId || 'temp-ref', image: itemFields.image || '',
                  url: itemFields.url || '', text: itemFields.text || '', list: itemFields.list || false,
                  parent: itemFields.parent || '', backlog, order: 0,
                  created: new Date().toISOString(), updated: new Date().toISOString(),
                  promptContext: mergedFields.promptContext || '',
                  expand: { 
                    ref: { 
                      id: existingRefId || 'temp-ref', 
                      title: itemFields.title || '', 
                      image: itemFields.image || '', // Use same image source
                      url: itemFields.url || '',
                      meta: '{}',
                      creator: user?.id || '',
                      created: new Date().toISOString(),
                      updated: new Date().toISOString()
                    }, 
                    creator: null as any, 
                    items_via_parent: [] as any 
                  }
                }

                // Add optimistic item to grid immediately
                const { addOptimisticItem } = useAppStore.getState()
                addOptimisticItem(optimisticItem)

                // Close the sheet immediately to show the animation
                bottomSheetRef.current?.close()
                
                // Background database operations
                ;(async () => {
                  try {
                    const newItem = await addToProfile(existingRefId, mergedFields, backlog)
                    
                    // Don't replace optimistic item - let it stay until grid refresh
                    // This prevents the flash from the replacement process
                    setItemData(newItem)
                  } catch (error) {
                    console.error('Failed to add item to profile:', error)
                    // Remove optimistic item on failure
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
                // remove (delete) itemToReplace from the grid
                await removeItem(itemToReplace.id)
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
              <UserLists
                creatorId={user?.id!}
                onComplete={async (list: ExpandedItem) => {
                  // Add the item to the list
                  await addItemToList(list.id, itemData?.id!)

                  // Fetch fresh data after adding
                  const updatedItem = await getItemById(list.id)
                  setItemData(updatedItem)
                  setStep('editList')
                }}
                onCreateList={async () => {
                  // Get the next available list number
                  const nextNumber = await getNextListNumber()
                  
                  // we should just have one function to create a list, which creates a ref and an item
                  const list = await addToProfile(
                    null,
                    {
                      title: `My List ${nextNumber}`,
                      text: '',
                      url: '',
                      image: '',
                      list: true,
                    },
                    false // Always add to grid, not backlog
                  )

                  // Add current item to the new list
                  await addItemToList(list.id, itemData?.id!)

                  // Fetch the expanded list data
                  const expandedList = await getItemById(list.id)

                  // Set the expanded item as current and show edit list
                  setItemData(expandedList)
                  setStep('editList')
                  
                  // Trigger grid refresh to show the new list
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
