import { Camera } from '../inputs/Camera'
import { YStack } from '../core/Stacks'
import { useUserStore, isProfile } from '@/features/pocketbase/stores/users'
import { Button } from '../buttons/Button'
import { Dimensions } from 'react-native'
import { useState, useEffect } from 'react'
import { RefForm } from '../actions/RefForm'
import { SearchRef } from '../actions/SearchRef'
import { FilteredItems } from '../actions/FilteredItems'
// import { SearchItem } from '../actions/SearchItem'
import { c } from '@/features/style'
import { StagedRef, CompleteRef, Item, ExpandedItem } from '@/features/pocketbase/stores/types'
import type { ImagePickerAsset } from 'expo-image-picker'
import { EditableList } from '../lists/EditableList'
import { CategoriseRef } from './CategoriseRef'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import { s } from '@/features/style'
import { useRefStore } from '@/features/pocketbase/stores/refs'
import { RefsTypeOptions } from '@/features/pocketbase/stores/pocketbase-types'
import { pocketbase } from '@/features/pocketbase/pocketbase'

import * as Clipboard from 'expo-clipboard'

export type NewRefStep = '' | 'add' | 'search' | 'editList' | 'addToList' | 'categorise'

const win = Dimensions.get('window')

export const NewRef = ({
  initialStep = '',
  initialRefData = {},
  onNewRef,
  onStep = (s) => console.log(s),
  onCancel,
  backlog = false,
}: {
  initialStep?: NewRefStep
  initialRefData?: StagedRef | CompleteRef
  onNewRef: (itm: Item) => void
  onStep: (step: string) => void
  onCancel: () => void
  backlog?: boolean
}) => {
  const [textOpen, setTextOpen] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [hasUrl, setHasUrl] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [step, setStep] = useState<NewRefStep>(initialStep)
  const [itemData, setItemData] = useState<ExpandedItem | null>(null)
  const [refData, setRefData] = useState<StagedRef | CompleteRef>(initialRefData)
  const { hasShareIntent } = useShareIntentContext()
  const { addToList } = useItemStore()
  const { push: pushRef } = useRefStore()
  const { push: pushItem } = useItemStore()

  const { user } = useUserStore()

  const addImageRef = async (asset: ImagePickerAsset) => {
    // @ts-ignore
    setRefData({ image: asset })
    setStep('add')
  }

  const addRefFromResults = (newRef: StagedRef) => {
    console.log(newRef)
    setRefData(newRef)
    setStep('add')
  }

  const handleNewRefCreated = (item: ExpandedItem, addToList: boolean = false) => {
    console.log('HANDLE NEW REF CREATED', item)
    if (!item.expand?.ref)
      throw new Error('unexpected: handleNewRefCreated should always be called with ExpandedItem')
    setItemData(item)
    setRefData(item.expand?.ref)

    if (addToList) {
      console.log('edit list')
      setStep('addToList')
      console.log(itemData)
    } else {
      setStep('categorise')
    }
  }

  useEffect(() => {
    if (hasShareIntent) {
      setStep('search')
    }
  }, [hasShareIntent])

  useEffect(() => {
    onStep(step)
  }, [step])

  useEffect(() => {
    const detectUrl = async () => {
      const hasUrl = await Clipboard.hasUrlAsync()

      if (hasUrl) {
        setHasUrl(true)
      }
    }

    detectUrl()
  }, [step])

  return (
    <BottomSheetView style={{ paddingHorizontal: s.$2 }}>
      {step === '' && (
        <YStack gap={s.$08} style={{ paddingTop: s.$1, paddingBottom: s.$6 }}>
          <Button
            variant="basicLeft"
            iconColor={c.surface}
            title="Type anything"
            iconSize={28}
            iconBefore="text-outline"
            onPress={() => {
              setStep('search')
              setTextOpen(true)
            }}
          />
          {hasUrl && (
            <Button
              variant="basicLeft"
              align="flex-start"
              title="Add from clipboard"
              iconBefore="clipboard-outline"
              iconSize={28}
              iconColor={c.surface}
              onPress={() => {
                setStep('search')
                setUrlOpen(true)
              }}
            />
          )}
          <Button
            variant="basicLeft"
            align="flex-start"
            title="Add from Camera Roll"
            iconBefore="image-outline"
            iconColor={c.surface}
            iconSize={28}
            onPress={() => {
              setStep('add')
              setPickerOpen(true)
            }}
          />
        </YStack>
      )}

      {step === 'search' && (
        <>
          {textOpen && <SearchRef onComplete={addRefFromResults} />}
          {urlOpen && <SearchRef paste={true} onComplete={addRefFromResults} />}
          {hasShareIntent && <SearchRef onComplete={addRefFromResults} />}
          {cameraOpen && <Camera />}
        </>
      )}

      {step === 'add' && (
        <RefForm
          r={refData}
          pickerOpen={pickerOpen}
          onComplete={handleNewRefCreated}
          onCancel={() => setRefData({})}
          backlog={backlog}
        />
      )}

      {step === 'categorise' && (
        <CategoriseRef
          item={itemData}
          existingRef={refData}
          onComplete={onNewRef}
          onBack={() => setStep('add')}
        />
      )}

      {step === 'addToList' && (
        <FilteredItems
          filter={`children:length > 0 && creator = "${user?.id}"`}
          onComplete={async (item) => {
            // Fetch the expanded item data first
            const expandedItem = await pocketbase
              .collection('items')
              .getOne<ExpandedItem>(item.id, {
                expand: 'ref,children',
              })
            // Add the reference to the list
            await addToList(expandedItem.id, refData as CompleteRef)
            // Fetch fresh data after adding
            const updatedItem = await pocketbase
              .collection('items')
              .getOne<ExpandedItem>(expandedItem.id, {
                expand: 'ref,children',
              })
            setItemData(updatedItem)
            setStep('editList')
          }}
          onCreateList={async () => {
            // Create new ref for the list
            const newRef = await pushRef({
              title: '',
              type: RefsTypeOptions.other,
              creator: user?.id,
            })

            // Create new item with the ref
            const newItem = await pushItem({
              ref: newRef.id,
              creator: user?.id,
              list: true,
            })

            // Add current ref to the new list
            await addToList(newItem.id, refData as CompleteRef)

            // Fetch the expanded item data
            const expandedItem = await pocketbase
              .collection('items')
              .getOne<ExpandedItem>(newItem.id, {
                expand: 'ref,children',
              })

            // Set the expanded item as current and show edit list
            setItemData(expandedItem)
            setStep('editList')
          }}
        />
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
            setStep('')
            setItemData(null)
            setRefData({})
          }}
        />
      )}
    </BottomSheetView>
  )
}
