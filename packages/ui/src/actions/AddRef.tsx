import { Picker } from '../inputs/Picker'
import { Camera } from '../inputs/Camera'
import { YStack, Button, Text, SizableText } from 'tamagui'
import { getTokens } from '@tamagui/core'
import { useState } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCanvasContext } from 'app/features/canvas/contract'
import { useLiveQuery } from '@canvas-js/hooks'

export const AddRef = ({ onAddRef }) => {
  const [textOpen, setTextOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const app = useCanvasContext()

  console.log(app)

  if (!app) throw new Error('Canvas App not found')

  const itemRows = useLiveQuery(app, 'items')

  const add = async () => {
    const myRef = await app.actions.createItem({ title: 'test' })
    onAddRef(myRef)
  }

  return (
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

      {textOpen && (
        <>
          <Text>{itemRows?.length}</Text>
          <Button onPress={add}>Add</Button>
        </>
      )}
      {pickerOpen && <Picker />}
      {cameraOpen && <Camera />}
    </YStack>
  )
}
