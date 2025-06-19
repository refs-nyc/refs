import { Camera } from '../inputs/Camera'
import { YStack } from '../core/Stacks'
import { useUserStore, isProfile } from '@/features/pocketbase/stores/users'
import { Button } from '../buttons/Button'
import { Dimensions, View } from 'react-native'
import { useState, useEffect } from 'react'
import { RefForm } from '../actions/RefForm'
import { SearchRef } from '../actions/SearchRef'
import { FilteredItems } from '../actions/FilteredItems'
import { c } from '@/features/style'
import { StagedRef, CompleteRef, Item, ExpandedItem } from '@/features/pocketbase/stores/types'
import type { ImagePickerAsset } from 'expo-image-picker'
import { EditableList } from '../lists/EditableList'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import { useItemStore } from '@/features/pocketbase/stores/items'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import { s } from '@/features/style'
import { useRefStore } from '@/features/pocketbase/stores/refs'
import { RefsTypeOptions } from '@/features/pocketbase/stores/pocketbase-types'
import { pocketbase } from '@/features/pocketbase/pocketbase'

import * as Clipboard from 'expo-clipboard'
import { Heading } from '../typo/Heading'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { addToProfile } from '@/features/pocketbase'

export type NewRefStep = '' | 'add' | 'search' | 'editList' | 'addToList'

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
  onNewRef: (itm: ExpandedItem) => void
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
  const { addItemToList } = useItemStore()
  const { push: pushRef } = useRefStore()
  const { push: pushItem } = useItemStore()

  const { user } = useUserStore()
  const insets = useSafeAreaInsets()

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
    <BottomSheetView
      style={{
        paddingHorizontal: s.$2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {step === '' && (
        <YStack
          gap={s.$08}
          style={{ paddingTop: s.$2, width: '100%', paddingBottom: insets.bottom }}
        >
          <Heading
            tag="h2normal"
            style={{ color: c.white, marginBottom: s.$2, textAlign: 'center' }}
          >
            Add a ref to {backlog ? 'your backlog' : 'your grid'}
          </Heading>
          <Button
            variant="whiteOutline"
            iconColor={c.surface}
            title="Type anything"
            iconSize={28}
            iconBefore="text-outline"
            style={{ width: '100%' }}
            onPress={() => {
              setStep('search')
              setTextOpen(true)
            }}
          />
          {hasUrl && (
            <Button
              variant="whiteOutline"
              align="flex-start"
              title="Add from clipboard"
              iconBefore="clipboard-outline"
              iconSize={28}
              iconColor={c.surface}
              style={{ width: '100%' }}
              onPress={() => {
                setStep('search')
                setUrlOpen(true)
              }}
            />
          )}
          <Button
            variant="whiteOutline"
            align="flex-start"
            title="Add from Camera Roll"
            iconBefore="image-outline"
            iconColor={c.surface}
            iconSize={28}
            style={{ width: '100%' }}
            onPress={() => {
              setStep('add')
              setPickerOpen(true)
            }}
          />
          <View style={{ height: 24 }} />
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
          onAddRef={async (fields) => {
            await addToProfile(refData, {
              image: fields.image,
              text: fields.text,
              backlog,
              list: false,
            })
            // finish the flow
            setStep('')
            setItemData(null)
            setRefData({})
          }}
          onAddRefToList={async (fields) => {
            const newItem = await addToProfile(refData, {
              image: fields.image,
              text: fields.text,
              backlog,
              list: true,
            })
            setItemData(newItem)
            setRefData(newItem.expand?.ref)
            setStep('addToList')
          }}
          backlog={backlog}
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
            setStep('')
            setItemData(null)
            setRefData({})
          }}
        />
      )}
    </BottomSheetView>
  )
}
