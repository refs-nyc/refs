import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack } from '../core/Stacks'
import { router } from 'expo-router'
import { useUserStore, isProfile } from '@/features/pocketbase/stores/users'
import { Button } from '../buttons/Button'
import { Dimensions, View } from 'react-native'
import { useState, useEffect } from 'react'
import { RefForm } from '../actions/RefForm'
import { SearchRef } from '../actions/SearchRef'
import { c } from '@/features/style'
import { StagedRef, CompleteRef, Item, ExpandedItem } from '@/features/pocketbase/stores/types'
import type { ImagePickerAsset } from 'expo-image-picker'
import { EditableList } from '../lists/EditableList'
import { CategoriseRef } from './CategoriseRef'
import { ShareIntent as ShareIntentType, useShareIntentContext } from 'expo-share-intent'
import { s } from '@/features/style'

import * as Clipboard from 'expo-clipboard'

type NewRefStep = '' | 'add' | 'search' | 'editList' | 'categorise'

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

  const { user } = useUserStore()

  const addImageRef = async (asset: ImagePickerAsset) => {
    setRefData({ image: asset })
    setStep('add')
  }

  const addRefFromResults = (newRef: StagedRef) => {
    console.log(newRef)
    setRefData(newRef)
    setStep('add')
  }

  const handleNewRefCreated = (item: ExpandedItem) => {
    console.log('HANDLE NEW REF CREATED', item)
    if (!item.expand?.ref)
      throw new Error('unexpected: handleNewRefCreated should always be called with ExpandedItem')
    setItemData(item)
    setRefData(item.expand?.ref)

    if (item.list) {
      setStep('editList')
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
    console.log('step changed', step)
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
    <>
      {step === '' && (
        <YStack gap={s.$08} style={{ paddingTop: s.$1, paddingBottom: s.$6 }}>
          <Button
            variant="basicLeft"
            iconColor={c.black}
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
              iconColor={c.black}
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
            iconColor={c.black}
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

      {step === 'editList' && itemData && (
        <EditableList
          item={itemData}
          onComplete={() => {
            if (!isProfile(user) || !user.userName) onCancel()
            onNewRef(itemData)
          }}
        />
      )}
    </>
  )
}
