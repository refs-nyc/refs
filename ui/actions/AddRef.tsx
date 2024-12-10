import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack, XStack } from '@/ui'
import Ionicons from '@expo/vector-icons/Ionicons'
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'
import { AddFromCameraRoll } from '../buttons/AddFromCameraRoll'
import { Dimensions } from 'react-native'
import { useState, useMemo } from 'react'
import { NewRef } from '../actions/NewRef'
import { SearchOrAddRef } from '../actions/SearchOrAddRef'
import { useCanvasContext } from '@/features/canvas/contract'
import { useLiveQuery } from '@canvas-js/hooks'
import type { ImagePickerAsset } from 'expo-image-picker'

const win = Dimensions.get('window')

export const AddRef = ({ onAddRef, onCancel }: { onAddRef: () => Item; onCancel: () => void }) => {
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

  const app = useCanvasContext()

  if (!app) throw new Error('Canvas App not found')

  const addImageRef = async (asset: ImagePickerAsset) => {
    const rd = { image: asset }
    // TODO; Upload to IPFS etc
    // await push(rd)
    setRefData(rd)
  }

  const addTextRef = async (newRef: StagedRef) => {
    console.log(newRef)
    // Replace
    // const rd = { title: searchQuery, image: null }
    // push(rd)
    // onAddRef(null)
    await setRefData(newRef)
  }

  return (
    <Animated.View style={{ minHeight }}>
      {pickerOpen && (
        <Picker onSuccess={(asset) => addImageRef(asset)} onCancel={() => setPickerOpen(false)} />
      )}

      {!addingRef && (
        <>
          {(cameraOpen || textOpen) && (
            <YStack>
              <XStack jc="space-between">
                <Ionicons
                  name="chevron-back"
                  onPress={() => {
                    updateMinHeight(0)
                    setCameraOpen(false)
                    setPickerOpen(false)
                    setTextOpen(false)
                  }}
                />
              </XStack>
              {textOpen && (
                <YStack gap="$2">
                  <SearchOrAddRef onComplete={addTextRef} />
                </YStack>
              )}
              {cameraOpen && <Camera />}
            </YStack>
          )}

          {!cameraOpen && !textOpen && (
            <YStack gap="$4">
              <AddFromCameraRoll
                title="Start typing"
                icon="text-outline"
                onPress={() => {
                  updateMinHeight(win.height * 0.7)
                  setTextOpen(true)
                }}
              />
              <AddFromCameraRoll
                title="Add from Camera Roll"
                icon="image-outline"
                onPress={() => setPickerOpen(true)}
              />
            </YStack>
          )}
        </>
      )}

      {addingRef && <NewRef r={refData} onComplete={onAddRef} onCancel={onCancel} />}
    </Animated.View>
  )
}
