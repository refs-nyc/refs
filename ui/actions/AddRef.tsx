import { DismissKeyboard } from '../atoms/DismissKeyboard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack } from '@/ui'
import { router } from 'expo-router'
import { useUserStore } from '@/features/pocketbase/stores/users'
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
  onAddRef: (itm: Item) => void
  onCancel: () => void
  backlog?: boolean
}) => {
  const [textOpen, setTextOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [step, setStep] = useState<'' | 'add' | 'search' | 'editList' | 'categorise'>('')
  const [itemData, setItemData] = useState<Item>({})
  const [refData, setRefData] = useState<StagedRef | CompleteRef>({})

  const { user } = useUserStore()

  const insets = useSafeAreaInsets()

  const keyboard = useAnimatedKeyboard()

  const animatedStyle = useAnimatedStyle(() => {
    if (step === '') return { height: 200 }
    return {
      height: win.height - s.$2 - keyboard.height.value - insets.top - insets.bottom,
    }
  })

  const addImageRef = async (asset: ImagePickerAsset) => {
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

        <Animated.View
          style={[animatedStyle, { justifyContent: 'flex-start', alignItems: 'stretch' }]}
        >
          {/* {
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
          } */}

          {step === '' && (
            <YStack gap="$4">
              <Button
                variant="basicLeft"
                iconColor={c.black}
                title="Type anything"
                iconBefore="text-outline"
                onPress={() => {
                  setStep('search')
                  setTextOpen(true)
                }}
              />
              <Button
                variant="basicLeft"
                align="flex-start"
                title="Add from Camera Roll"
                iconBefore="image-outline"
                iconColor={c.black}
                onPress={() => {
                  setStep('search')
                  setPickerOpen(true)
                }}
              />
            </YStack>
          )}

          {step === 'search' && (
            <>
              {textOpen && <SearchOrAddRef onComplete={addRefFromResults} />}
              {cameraOpen && <Camera />}
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

          {step === 'editList' && (
            <EditableList
              item={itemData}
              onComplete={() => {
                if (!user.userName) onCancel()
                onAddRef(itemData)
              }}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </DismissKeyboard>
  )
}
