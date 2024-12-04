import { Picker, Camera } from '@my/ui'
import { YStack, Button, Text, SizableText } from 'tamagui'
import { getTokens } from '@tamagui/core'
import { useState } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'

export const AddRef = ({ onAddRef }) => {
  const [textOpen, setTextOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

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

      {textOpen && <Text>Search</Text>}
      {pickerOpen && <Picker />}
      {cameraOpen && <Camera />}
    </YStack>
  )
}
