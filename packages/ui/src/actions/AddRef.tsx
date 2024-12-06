import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack, Button, View, SizableText, XStack } from 'tamagui'
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'
import { TextInput, Dimensions } from 'react-native'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { getTokens } from '@tamagui/core'
import { useState, useMemo } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { NewRef } from '../actions/NewRef'
import { SearchOrAddRef } from '../actions/SearchOrAddRef'
import { useItemStore } from 'app/features/canvas/models'
import { useCanvasContext } from 'app/features/canvas/contract'
import { useLiveQuery } from '@canvas-js/hooks'

const win = Dimensions.get('window')

export const AddRef = ({
  onAddRef,
  onCancel,
}: {
  onAddRef: () => RefsItem
  onCancel: () => void
}) => {
  const { items, push } = useItemStore()

  const [textOpen, setTextOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [refData, setRefData] = useState<StagedRef>({})

  const minHeight = useSharedValue(0)

  const updateMinHeight = (val: number) => {
    minHeight.value = withSpring(val)
  }

  const editing = useMemo(
    () => textOpen || pickerOpen || cameraOpen,
    [textOpen, pickerOpen, cameraOpen]
  )
  const addingRef = useMemo(() => refData?.image || refData?.title, [refData])

  const app = useCanvasContext()

  if (!app) throw new Error('Canvas App not found')

  const itemRows = useLiveQuery(app, 'items')

  const addImageRef = async (uri: string) => {
    const rd = { title: null, image: uri }
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
        <Picker onSuccess={(uri) => addImageRef(uri)} onCancel={() => setPickerOpen(false)} />
      )}

      {!addingRef && (
        <>
          {(cameraOpen || textOpen) && (
            <YStack>
              <XStack jc="space-between">
                <ChevronLeft
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
              <Button
                onPress={() => {
                  updateMinHeight(win.height * 0.7)
                  setTextOpen(true)
                }}
                borderColor="transparent"
                borderWidth="$1"
                borderRadius="$12"
                jc="flex-start"
                bg="white"
              >
                <Ionicons size={getTokens().size.$2.val} name="text-outline"></Ionicons>
                <SizableText size="$5">Start typing</SizableText>
              </Button>
              <Button
                onPress={() => setPickerOpen(true)}
                borderColor="transparent"
                borderWidth="$1"
                borderRadius="$12"
                jc="flex-start"
                bg="white"
              >
                <Ionicons size={getTokens().size.$2.val} name="image-outline"></Ionicons>
                <SizableText size="$5">Add from camera roll</SizableText>
              </Button>
              {/* <Button
              onPress={() => setCameraOpen(true)}
              borderColor="transparent"
              borderWidth="$1"
              borderRadius="$12"
              jc="flex-start"
              bg="white"
            >
              <Ionicons size={getTokens().size.$2.val} name="camera-outline"></Ionicons>
              <SizableText size="$5">Take a photo</SizableText>
            </Button> */}
            </YStack>
          )}
        </>
      )}

      {addingRef && <NewRef r={refData} onComplete={onAddRef} onCancel={onCancel} />}
    </Animated.View>
  )
}
