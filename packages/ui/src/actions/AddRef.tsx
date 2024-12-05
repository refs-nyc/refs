import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack, Button, Text, SizableText, XStack } from 'tamagui'
import { TextInput } from 'react-native'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { getTokens } from '@tamagui/core'
import { useState, useMemo } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useItemStore } from 'app/features/canvas/models'

export const AddRef = ({ onAddRef }) => {
  const { items, push } = useItemStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [textOpen, setTextOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [stagedData, setStagedData] = useState<{ uri?: string }>({})

  const editing = useMemo(
    () => textOpen || pickerOpen || cameraOpen,
    [textOpen, pickerOpen, cameraOpen]
  )

  const app = useCanvasContext()

  console.log(app)

  if (!app) throw new Error('Canvas App not found')

  const itemRows = useLiveQuery(app, 'items')

  const addImageRef = async (uri: string) => {
    // TODO; Upload to IPFS etc
    await push({ title: 'Image', image: uri })
  }

  const addTextRef = async () => {
    // Replace
    // const myRef = await app.actions.createItem({ title: 'test' })
    push({ title: searchQuery })
    onAddRef(null)
  }

  return (
    <>
      {(cameraOpen || textOpen) && (
        <YStack>
          <XStack jc="space-between">
            <ChevronLeft
              onPress={() => {
                setCameraOpen(false)
                setPickerOpen(false)
                setTextOpen(false)
              }}
            />
          </XStack>
          {textOpen && (
            <YStack gap="$2">
              <TextInput
                value={searchQuery}
                placeholder="Start typing"
                onChangeText={setSearchQuery}
              />
              <Button disabled={searchQuery.length === 0} onPress={addTextRef}>
                Add
              </Button>
            </YStack>
          )}
          {cameraOpen && <Camera />}
        </YStack>
      )}

      {pickerOpen && (
        <Picker onSuccess={(uri) => addImageRef(uri)} onCancel={() => setPickerOpen(false)} />
      )}

      {!cameraOpen && !textOpen && (
        <YStack gap="$4">
          <Button
            onPress={() => setTextOpen(true)}
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
          <Button
            onPress={() => setCameraOpen(true)}
            borderColor="transparent"
            borderWidth="$1"
            borderRadius="$12"
            jc="flex-start"
            bg="white"
          >
            <Ionicons size={getTokens().size.$2.val} name="camera-outline"></Ionicons>
            <SizableText size="$5">Take a photo</SizableText>
          </Button>
        </YStack>
      )}
    </>
  )
}
