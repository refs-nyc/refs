import { useState } from 'react'
import { Pressable, Dimensions } from 'react-native'
import { View, H2, YStack, Spinner } from 'tamagui'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { EditableTitle } from '../atoms/EditableTitle'
import { createRefWithItem } from 'app/features/canvas/stores'
import { MainButton } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'

const win = Dimensions.get('window')

export const AddImage = ({
  onAddImage,
  hideNew = false,
}: {
  onAddImage: (a: ImagePickerAsset) => ImagePickerAsset
  hideNew?: boolean
}) => {
  const [picking, setPicking] = useState(false)

  return (
    <>
      {picking && <Picker onSuccess={onAddImage} onCancel={() => setPicking(false)} />}
      <View width="100%" jc="center" ai="center">
        {!hideNew && (
          <Pressable onPress={() => setPicking(true)}>
            <View
              style={{ width: 200, height: 200 }}
              jc="center"
              ai="center"
              borderColor="black"
              borderWidth="$1"
              borderRadius={1000}
            >
              <H2>+</H2>
            </View>
          </Pressable>
        )}
        <MainButton onPress={() => setPicking(true)}>Add from camera roll</MainButton>
      </View>
    </>
  )
}

export const AvatarPicker = ({
  source = '',
  placeholder = 'What is it',
  onComplete,
}: {
  source: string
  children: React.ReactNode
  placeholder: string
  onComplete: (s: string) => void
}) => {
  const [currentSource, setCurrentSource] = useState(source)
  const [imageAsset, setImageAsset] = useState(null)
  const [pinataSource, setPinataSource] = useState('')

  const updatePinata = (image: string) => {
    setPinataSource(image)

    // Side effects...
    onComplete(image)
  }

  return (
    <View>
      <YStack gap="$3">
        {imageAsset ? (
          <>
            <PinataImage
              round
              asset={imageAsset}
              onSuccess={updatePinata}
              onFail={() => console.error('Cant ul')}
            />
            <AddImage
              hideNew
              onAddImage={(a: ImagePickerAsset) => {
                setImageAsset(null)
                setImageAsset(a)
              }}
            />
          </>
        ) : (
          <AddImage
            onAddImage={(a: ImagePickerAsset) => {
              setImageAsset(null)
              setImageAsset(a)
            }}
          />
        )}
      </YStack>
    </View>
  )
}
