import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated'
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
import { s } from '@/features/style'

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

  const insets = useSafeAreaInsets()

  const keyboard = useAnimatedKeyboard()

  const animatedStyle = useAnimatedStyle(() => {
    return {
      // marginBottom: s.$8,
      height: win.height - s.$10 - keyboard.height.value - insets.top - insets.bottom,
    }
  })

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
      <KeyboardAvoidingView
        behavior="height"
        style={{
          marginHorizontal: 12,
          flex: 1,
        }}
      >
        {pickerOpen && (
          <Picker onSuccess={(asset) => addImageRef(asset)} onCancel={() => setPickerOpen(false)} />
        )}

        {step === '' && (
          <Animated.View style={animatedStyle}>
            <Ionicons
              name="chevron-back"
              size={20}
              onPress={() => {
                setCameraOpen(false)
                setPickerOpen(false)
                setTextOpen(false)
                setStep('')
              }}
            />

            {textOpen && <SearchOrAddRef onComplete={addRefFromResults} />}
            {cameraOpen && <Camera />}

            {step === '' && !textOpen && !cameraOpen && (
              <YStack gap="$4">
                <Button
                  variant="basicLeft"
                  iconColor={c.black}
                  title="Type anything"
                  iconBefore="text-outline"
                  onPress={() => {
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
          </Animated.View>
        )}

        {step === 'add' && (
          <NewRef
            style={{ height: '100%' }}
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
    </DismissKeyboard>
  )
}
