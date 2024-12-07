import { useState } from 'react'
import { prepareRef } from '../@refs/core'
import { Pressable, Dimensions } from 'react-native'
import { Text, View, H2, YStack } from 'tamagui'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { EditableTitle } from '../atoms/EditableTitle'
import { useItemStore, createRefWithItem } from 'app/features/canvas/stores'
import { MainButton } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'

const win = Dimensions.get('window')

const AddImage = ({ onAddImage }: { onAddImage: () => ImagePickerAsset }) => {
  const [picking, setPicking] = useState(false)

  return (
    <>
      {picking && <Picker onSuccess={onAddImage} onCancel={() => setPicking(false)} />}
      <View width="100%" jc="center" ai="center">
        <Pressable onPress={() => setPicking(true)}>
          <View
            style={{ width: 200, height: 200 }}
            jc="center"
            ai="center"
            borderColor="black"
            borderWidth="$1"
            borderRadius={10}
          >
            <H2>+</H2>
          </View>
        </Pressable>
      </View>
    </>
  )
}

export const NewRef = ({
  r,
  placeholder = 'What is it',
  onComplete,
}: {
  r: StagedRef
  placeholder: string
  onComplete: (i: Item) => void
}) => {
  const [currentRef, setCurrentRef] = useState<StagedRef>(r)
  const [imageAsset, setImageAsset] = useState(r?.image || null)

  const minHeight = win.height * 0.7

  const updateRef = (image) => {
    const u = { ...r, image }
    setCurrentRef(u)
  }

  const updateRefTitle = (title) => {
    const u = { ...r, title }
    setCurrentRef(u)
  }

  const submit = async () => {
    const { item, ref } = await createRefWithItem(currentRef)
    console.log(item, ref)
    onComplete(item)
  }

  return (
    <>
      <View style={{ minHeight }}>
        <YStack gap="$3">
          {imageAsset ? (
            <PinataImage
              asset={imageAsset}
              onSuccess={() => updateRef}
              onFail={() => console.error('Cant ul')}
            />
          ) : (
            <AddImage onAddImage={updateRef} />
          )}
          {
            <EditableTitle
              onComplete={updateRefTitle}
              onChangeTitle={updateRefTitle}
              placeholder={placeholder}
              title={r?.title || placeholder}
            />
          }
        </YStack>
      </View>

      <MainButton disabled={!currentRef.title} onPress={submit}>
        Done
      </MainButton>
    </>
  )
}
