import { DismissKeyboard } from '../atoms/DismissKeyboard'

import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack, XStack } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'
import { Button } from '../buttons/Button'
import { Dimensions } from 'react-native'
import { useState, useMemo } from 'react'
import { NewRef } from '../actions/NewRef'
import { SearchOrAddRef } from '../actions/SearchOrAddRef'
// import { useCanvasContext } from '@/features/canvas/provider'
import { c } from '@/features/style'

import type { ImagePickerAsset } from 'expo-image-picker'

const win = Dimensions.get('window')

export const AddRef = ({
  onAddRef,
  onCancel,
  backlog = false,
}: {
  onAddRef: () => Item
  onCancel: () => void
  backlog?: boolean
}) => {
  const [textOpen, setTextOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [refData, setRefData] = useState<StagedRef>({})

  const minHeight = useSharedValue(0)

  const updateMinHeight = (val: number) => {
    minHeight.set(withSpring(val))
  }

  const editing = useMemo(
    () => textOpen || pickerOpen || cameraOpen,
    [textOpen, pickerOpen, cameraOpen]
  )
  const addingRef = useMemo(() => refData?.image || refData?.title, [refData])

  const addImageRef = async (asset: ImagePickerAsset) => {
    const rd = { image: asset }
    // TODO; Upload to IPFS etc
    // await push(rd)
    setRefData(rd)
  }

  const addTextRef = async (newRef: StagedRef) => {
    await setRefData(newRef)
  }

  return (
    <DismissKeyboard>
      <Animated.View style={{ minHeight, paddingHorizontal: 12, paddingBottom: 56 }}>
        {pickerOpen && (
          <Picker onSuccess={(asset) => addImageRef(asset)} onCancel={() => setPickerOpen(false)} />
        )}

        {!addingRef && (
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
                    }}
                  />
                </XStack>
                {textOpen && <SearchOrAddRef onComplete={addTextRef} />}
                {cameraOpen && <Camera />}
              </YStack>
            )}

            {!cameraOpen && !textOpen && (
              <YStack gap="$4">
                <Button
                  align="flex-start"
                  variant="basic"
                  iconColor={c.black}
                  title="Type anything"
                  iconBefore="text-outline"
                  onPress={() => {
                    updateMinHeight(win.height * 0.9)
                    setTextOpen(true)
                  }}
                />
                <Button
                  align="left"
                  title="Add from Camera Roll"
                  iconBefore="image-outline"
                  onPress={() => setPickerOpen(true)}
                />
              </YStack>
            )}
          </>
        )}

        {addingRef && (
          <NewRef
            r={refData}
            onComplete={onAddRef}
            onCancel={() => setRefData({})}
            backlog={backlog}
          />
        )}
      </Animated.View>
    </DismissKeyboard>
  )
}
