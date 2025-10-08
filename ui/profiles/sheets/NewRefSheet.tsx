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
import { View, Platform, Keyboard, Dimensions, InteractionManager } from 'react-native'
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
  // Track if keyboard is currently visible
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false)
  // Track if we're transitioning to add step to prevent keyboard hide interference
  const [transitioningToAdd, setTransitioningToAdd] = useState<boolean>(false)
  // Track if we're transitioning to link editing to prevent unwanted snaps
  const [transitioningToLink, setTransitioningToLink] = useState<boolean>(false)
  // Track if we're transitioning to any field editing to prevent unwanted snaps
  const [transitioningToField, setTransitioningToField] = useState<boolean>(false)
  // Track if sheet is closing to prevent keyboardDidHide interference
  const [sheetClosing, setSheetClosing] = useState<boolean>(false)
  // Track if we're transitioning from camera roll to prevent add step effect interference
  const [transitioningFromCameraRoll, setTransitioningFromCameraRoll] = useState<boolean>(false)
  // Track if we're submitting a ref to prevent any effects from interfering
  const [submittingRef, setSubmittingRef] = useState<boolean>(false)


  // Track keyboard state
  useEffect(() => {
    // Don't set up keyboard listeners if sheet is not open
    if (!isSheetOpen) {
      return
    }

    const keyboardDidShow = () => {
      // Don't snap again if already at the right height
      if (!isSheetOpen) return
      
      setKeyboardVisible(true)
      console.log('⌨️ KEYBOARD SHOW - step:', step, 'captionFocused:', captionFocused, 'sheetIndex:', sheetIndex, 'transitioningToField:', transitioningToField)

      // Don't run if we're submitting a ref
      if (submittingRef) {
        console.log('⌨️ KEYBOARD SHOW - Blocked by submittingRef flag')
        return
      }

      // Don't run if we're transitioning to field editing
      if (transitioningToField) {
        console.log('⌨️ KEYBOARD SHOW - Blocked by transitioningToField flag')
        return
      }

      // Don't run if we're transitioning from camera roll
      if (transitioningFromCameraRoll) {
        console.log('⌨️ KEYBOARD SHOW - Blocked by transitioningFromCameraRoll flag')
        return
      }

      // During search step, always show at 80% (index 1)
      if (step === 'search') {
        requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(1)) // 80%
        return
      }

      // For add step, snap to 110% if caption is focused, otherwise snap to 85%
      if (step === 'add') {
        if (captionFocused) {
          console.log('⌨️ KEYBOARD SHOW - Caption focused, snapping to 110%')
          const targetIndex = 4 // 110%
          if (sheetIndex === targetIndex) return
          requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(targetIndex))
        } else {
          console.log('⌨️ KEYBOARD SHOW - No caption focus, snapping to 85%')
          // For add step without caption focus, snap to 85%
          const targetIndex = 2 // 85%
          if (sheetIndex === targetIndex) return
          requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(targetIndex))
        }
      }
    }
    const keyboardDidHide = () => {
      if (!isSheetOpen) return
      
      setKeyboardVisible(false)
      
      // Don't run if we're submitting a ref
      if (submittingRef) {
        console.log('⌨️ KEYBOARD HIDE - Blocked by submittingRef flag')
        return
      }
      
      // Don't run if we're manually handling a transition
      if (manualTransition) {
        return
      }
      
      // Don't run if keyboard is being dismissed
      if (keyboardDismissing) {
        return
      }

      // Don't run if we're transitioning from camera roll
      if (transitioningFromCameraRoll) {
        console.log('⌨️ KEYBOARD HIDE - Blocked by transitioningFromCameraRoll flag')
        return
      }
      
      // Reset caption focus state when keyboard is dismissed
      setCaptionFocused(false)
      
      // When keyboard is dismissed, snap directly to 67% (default position)
      bottomSheetRef.current?.snapToIndex(0) // 67%
    }
    const showSub = Keyboard.addListener('keyboardDidShow', keyboardDidShow)
    const hideSub = Keyboard.addListener('keyboardDidHide', keyboardDidHide)
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [bottomSheetRef, isSheetOpen, sheetIndex, captionFocused, step, manualTransition, keyboardDismissing, submittingRef, transitioningFromCameraRoll])

  // When transitioning to the add step (e.g., after selecting from camera roll),
  // ensure the sheet is visible at 85% immediately, independent of keyboard events.
  useEffect(() => {
    if (!isSheetOpen) return
    if (keyboardDismissing) {
      console.log('🚫 ADD STEP EFFECT - Blocked by keyboardDismissing flag')
      return // Don't run when keyboard is being dismissed
    }
    if (submittingRef) {
      console.log('🚫 ADD STEP EFFECT - Blocked by submittingRef flag (submittingRef:', submittingRef, ')')
      return // Don't run when submitting a ref
    }
    // Don't run the add step effect if we're transitioning from camera roll
    // This prevents the unwanted snap to 110% then back to 85%
    if (transitioningFromCameraRoll || (refFields?.image && !addRefPrompt)) {
      console.log('🚫 ADD STEP EFFECT - Blocked by camera roll transition')
      return
    }
    if (step === 'add') {
      console.log('📊 ADD STEP EFFECT - step=add, sheetIndex:', sheetIndex, 'captionFocused:', captionFocused)
      // Set flag to prevent keyboard hide interference during transition
      setTransitioningToAdd(true)
      // Clear flag after transition completes
      setTimeout(() => {
        setTransitioningToAdd(false)
      }, 500)
      
      // Don't snap to 85% if caption is focused - let caption focus effect handle it
      if (captionFocused) {
        console.log('📊 ADD STEP EFFECT - Caption focused, skipping')
        return
      }
      // Don't snap to 85% if we're not in a state where we should be at 85%
      // Only snap to 85% when initially opening the add step or transitioning from search
      if (sheetIndex !== -1 && sheetIndex !== 1) {
        console.log('📊 ADD STEP EFFECT - Wrong sheetIndex:', sheetIndex, 'skipping')
        return
      }

      
      // For non-photo prompts transitioning from search, the keyboard is already up
      // so we need to snap to 85% and let the keyboard behavior handle the final position
      console.log('📊 ADD STEP EFFECT - Snapping to index 2 (85%)')
      // Snap immediately to prevent any intermediate positions
      bottomSheetRef.current?.snapToIndex(2) // 85%
      // Also use requestAnimationFrame as backup
      requestAnimationFrame(() => {
        bottomSheetRef.current?.snapToIndex(2) // 85%
        // For non-photo prompts transitioning from search with keyboard up, ensure we stay at 85%
        if (sheetIndex === 1 && keyboardVisible) {
          // We're transitioning from search with keyboard up, so force the position
          setTimeout(() => {
            bottomSheetRef.current?.snapToIndex(2) // 85%
          }, 100)
        }
      })
    }
  }, [step, isSheetOpen, bottomSheetRef, captionFocused, sheetIndex, keyboardDismissing, keyboardVisible, transitioningFromCameraRoll, submittingRef])

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
    if (submittingRef) {
      console.log('🚫 CAPTION FOCUS EFFECT - Blocked by submittingRef flag')
      return // Don't run when submitting a ref
    }
    if (transitioningToLink) {
      console.log('🚫 CAPTION FOCUS EFFECT - Blocked by transitioningToLink flag')
      return // Don't run when transitioning to link editing
    }
    if (step !== 'add') return
    if (!captionFocused) return // Only run when caption becomes focused, not when it loses focus
    
    console.log('📝 CAPTION FOCUS EFFECT - Snapping to index 4 (110%)')
    // Snap to 110% when caption is focused
    requestAnimationFrame(() =>
      bottomSheetRef.current?.snapToIndex(4) // 110%
    )
  }, [captionFocused, step, isSheetOpen, bottomSheetRef, sheetIndex, keyboardDismissing, transitioningToLink, submittingRef])

  // Handle photo prompts - use selectedPhoto from store if available
  useEffect(() => {
    if (submittingRef) {
      console.log('🚫 PHOTO PROMPT EFFECT - Blocked by submittingRef flag (submittingRef:', submittingRef, ')')
      return // Don't run when submitting a ref
    }
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
  }, [isOpen, addRefPrompt, submittingRef])

  return (
    <BottomSheet
      enableDynamicSizing={false}
      ref={bottomSheetRef}
      enablePanDownToClose={true}
      snapPoints={snapPoints}
      index={-1}

      backgroundStyle={{ backgroundColor: c.olive, borderRadius: 50, paddingTop: 0 }}
      onAnimate={(fromIndex, toIndex) => {
        // Dismiss keyboard immediately when sheet starts closing
        if (fromIndex !== -1 && toIndex === -1) {
          console.log('⌨️ SHEET CLOSING - Dismissing keyboard immediately')
          try { 
            Keyboard.dismiss() 
          } catch (e) {
            console.warn('Failed to dismiss keyboard:', e)
          }
        }
      }}
      onChange={(i: number) => {
        console.log('📱 SHEET CHANGE - index:', i, 'step:', step)
        setIsSheetOpen(i !== -1)
        setSheetIndex(i)
        if (i === -1) {
          // Set manual transition flag to prevent keyboardDidHide interference
          setManualTransition(true)
          
          // Clear all focus states immediately
          setCaptionFocused(false)
          setTransitioningToField(false)
          setTransitioningToAdd(false)
          setSubmittingRef(false)

          setAddingNewRefTo(null)
          setStep('search')
          setItemData(null)
          setStagedItemFields(null)
          setItemToReplace(null)
          setExistingRefId(null)
          setRefFields(null)
          setPhotoPromptActive(false)
          
          // Clear flag after delay
          setTimeout(() => {
            setManualTransition(false)
          }, 300)
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
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
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
                // Set flag to prevent add step effect interference
                setTransitioningFromCameraRoll(true)
                setStep('add')
                // Snap to 85% immediately for camera roll transitions
                setTimeout(() => {
                  bottomSheetRef.current?.snapToIndex(2) // 85%
                }, 50)
                // Clear flag after transition completes - longer delay to ensure effect doesn't run
                setTimeout(() => {
                  setTransitioningFromCameraRoll(false)
                }, 1000)
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
              onCaptionFocus={(focused) => {
                console.log('📝 CAPTION FOCUS CHANGE - focused:', focused, 'stack trace:', new Error().stack?.split('\n').slice(1, 4).join('\n'))
                setCaptionFocused(focused)
                // If caption loses focus, immediately snap to 67%
                if (!focused) {
                  console.log('📝 CAPTION BLUR - Immediately snapping to 67%')
                  // Don't snap to 67% if we're submitting a ref
                  if (submittingRef) {
                    console.log('📝 CAPTION BLUR - Blocked by submittingRef flag')
                    return
                  }
                  // Don't snap to 67% if we're transitioning to link editing
                  if (transitioningToLink) {
                    console.log('📝 CAPTION BLUR - Blocked by transitioningToLink flag')
                    return
                  }
                  // Set ALL flags to prevent any keyboard interference
                  setManualTransition(true)
                  setKeyboardDismissing(true)
                  // Snap immediately - this should happen before keyboard dismisses
                  bottomSheetRef.current?.snapToIndex(0) // 67%
                  // Clear flags after a longer delay to ensure keyboard hide completes
                  setTimeout(() => {
                    setManualTransition(false)
                    setKeyboardDismissing(false)
                  }, 500)
                }
              }}
              onManualTransition={() => {
                console.log('🔄 MANUAL TRANSITION - Setting flag and snapping to 67%')
                setManualTransition(true)
                // Snap immediately without requestAnimationFrame delay
                bottomSheetRef.current?.snapToIndex(0) // 67%
                // Clear manual transition flag after a delay to ensure keyboard hide completes
                setTimeout(() => {
                  setManualTransition(false)
                }, 300)
              }}
              onLinkIconClick={() => {
                console.log('🔗 LINK ICON TRANSITION - Setting transitioningToLink flag')
                setTransitioningToLink(true)
                // Clear flag after transition completes
                setTimeout(() => {
                  console.log('🔗 LINK ICON TRANSITION - Clearing transitioningToLink flag')
                  setTransitioningToLink(false)
                }, 500)
              }}
              onFieldEditStart={() => {
                console.log('📝 FIELD EDIT START - Setting transitioningToField flag and snapping to 85%')
                setTransitioningToField(true)
                // Immediately snap to 85% to prevent unwanted snap to 110%
                bottomSheetRef.current?.snapToIndex(2) // 85%
                // Also use requestAnimationFrame as backup to ensure it runs
                requestAnimationFrame(() => {
                  bottomSheetRef.current?.snapToIndex(2) // 85%
                })
                // Clear flag after transition completes
                setTimeout(() => {
                  console.log('📝 FIELD EDIT START - Clearing transitioningToField flag')
                  setTransitioningToField(false)
                }, 500)
              }}


              onAddRef={async (itemFields) => {
                console.log('🚀 ON ADD REF CALLED - Setting submittingRef flag')
                // Set flag to prevent any effects from interfering during submission
                setSubmittingRef(true)
                
                // Force a synchronous state update
                requestAnimationFrame(() => {
                  console.log('🚀 ON ADD REF - Flag should be set now')
                })
                
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

                // Dismiss keyboard first, then close the sheet
                Keyboard.dismiss()
                
                // Force close the sheet with multiple approaches
                setTimeout(() => {
                  console.log('🚀 FORCING SHEET CLOSE - trying multiple methods')
                  // Try close() first
                  bottomSheetRef.current?.close()
                  // Also try snapToIndex(-1) as backup
                  setTimeout(() => {
                    bottomSheetRef.current?.snapToIndex(-1)
                  }, 50)
                  // Also try setting state directly
                  setTimeout(() => {
                    setIsSheetOpen(false)
                  }, 100)
                }, 200)
                
                // Clear the submitting flag after a longer delay to ensure all effects are done
                setTimeout(() => {
                  setSubmittingRef(false)
                }, 1000)
                
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
