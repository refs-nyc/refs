import { DismissKeyboard } from '../atoms/DismissKeyboard'

import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack, XStack } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'
import { Button } from '../buttons/Button'
import { Dimensions, KeyboardAvoidingView } from 'react-native'
import { useState, useMemo } from 'react'
import { NewRef } from '../actions/NewRef'
import { SearchOrAddRef } from '../actions/SearchOrAddRef'
import { c } from '@/features/style'
import { StagedRef, CompleteRef, Item } from '@/features/pocketbase/stores/types'
import type { ImagePickerAsset } from 'expo-image-picker'
import { EditableList } from '../lists/EditableList'
import { CategoriseRef } from './CategoriseRef'

const win = Dimensions.get('window')

export const AddRef = ({
  onAddRef,
  onCancel,
  backlog = false,
}: {
  onAddRef: () => void
  onCancel: () => void
  backlog?: boolean
}) => {
  const [textOpen, setTextOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [step, setStep] = useState<'' | 'add' | 'editList' | 'categorise'>('')
  const [itemData, setItemData] = useState<Item>({})
  const [refData, setRefData] = useState<StagedRef | CompleteRef>({})

  const minHeight = useSharedValue(0)

  const updateMinHeight = (val: number) => {
    minHeight.set(withSpring(val))
  }

  const addImageRef = async (asset: ImagePickerAsset) => {
    // TODO; Upload to IPFS etc
    // await push(rd)
    setRefData({ image: asset })
    setStep('add')
  }

  const addRefFromResults = (newRef: StagedRef) => {
    setRefData(newRef)
    setStep('add')
  }

  const handleNewRefCreated = (item) => {
    console.log('HANDLE NEW REF CREATED', item)
    setItemData(item)
    setRefData(item.expand.ref)

    console.log(item, item.expand.ref)

    if (item.list) {
      setStep('editList')
    } else {
      setStep('categorise')
    }
  }

  return (
    <DismissKeyboard>
      <Animated.View style={{ minHeight, paddingHorizontal: 12, paddingBottom: 56 }}>
        <KeyboardAvoidingView>
          {pickerOpen && (
            <Picker
              onSuccess={(asset) => addImageRef(asset)}
              onCancel={() => setPickerOpen(false)}
            />
          )}

          {step === '' && (
            <>
              {(cameraOpen || textOpen) && (
                <YStack gap={20}>
                  <XStack style={{ justifyContent: 'space-between' }}>
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      onPress={() => {
                        updateMinHeight(0)
                        setCameraOpen(false)
                        setPickerOpen(false)
                        setTextOpen(false)
                        setStep('')
                      }}
                    />
                  </XStack>
                  {textOpen && <SearchOrAddRef onComplete={addRefFromResults} />}
                  {cameraOpen && <Camera />}
                </YStack>
              )}

              {step === '' && !textOpen && !cameraOpen && (
                <YStack gap="$4">
                  <Button
                    variant="basicLeft"
                    iconColor={c.black}
                    title="Type anything"
                    iconBefore="text-outline"
                    onPress={() => {
                      updateMinHeight(win.height * 0.9)
                      setTextOpen(true)
                    }}
                  />
                  <Button
                    variant="basicLeft"
                    align="flex-start"
                    title="Add from Camera Roll"
                    iconBefore="image-outline"
                    iconColor={c.black}
                    onPress={() => setPickerOpen(true)}
                  />
                </YStack>
              )}
            </>
          )}

          {step === 'add' && (
            <NewRef
              r={refData}
              onComplete={handleNewRefCreated}
              onCancel={() => setRefData({})}
              backlog={backlog}
            />
          )}

          {step === 'categorise' && (
            <CategoriseRef item={itemData} completeRef={refData} onComplete={onAddRef} />
          )}

          {step === 'editList' && <EditableList item={itemData} />}
        </KeyboardAvoidingView>
      </Animated.View>
    </DismissKeyboard>
  )
}
