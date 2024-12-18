import { useState } from 'react'
import { View, Pressable, Dimensions } from 'react-native'
import { Heading, YStack } from '@/ui'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { EditableTitle } from '../atoms/EditableTitle'
import { createRefWithItem } from '@/features/canvas/stores'
import { Button } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'

const win = Dimensions.get('window')

export const AddImage = ({
  onAddImage,
}: {
  onAddImage: (a: ImagePickerAsset) => ImagePickerAsset
}) => {
  const [picking, setPicking] = useState(false)

  return (
    <>
      {picking && <Picker onSuccess={onAddImage} onCancel={() => setPicking(false)} />}
      <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <Pressable onPress={() => setPicking(true)}>
          <View style={{ width: 200, height: 200, justifyContent: 'center', alignItems: 'center' }}>
            {/* borderColor="black"
            borderWidth="$1"
            borderRadius={10} */}
            <Heading tag="h2light">+</Heading>
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
  backlog = false,
}: {
  r: StagedRef
  placeholder: string
  onComplete: (i: Item) => void
  backlog?: boolean
}) => {
  const [currentRef, setCurrentRef] = useState<StagedRef>({ ...r })
  const [imageAsset, setImageAsset] = useState(r?.image || null)
  const [pinataSource, setPinataSource] = useState('')

  const minHeight = win.height * 0.7

  const updateRefImage = (image: string) => {
    setPinataSource(image)

    const u = { ...r, image }
    setCurrentRef(u)
  }

  const updateRefTitle = (title) => {
    const u = { ...r, title }
    setCurrentRef(u)
  }

  const submit = async () => {
    try {
      console.log(currentRef)
      const { item, ref } = await createRefWithItem({ ...currentRef, image: pinataSource, backlog })
      console.log(item)
      console.log(ref)
      onComplete(item)
    } catch (e) {
      console.error(e)
    } finally {
      console.log('Done')
    }
  }

  return (
    <>
      <View style={{ minHeight }}>
        <YStack gap="$3">
          {imageAsset ? (
            <PinataImage
              asset={imageAsset}
              onSuccess={updateRefImage}
              onFail={() => console.error('Cant ul')}
            />
          ) : (
            <AddImage
              onAddImage={(a: ImagePickerAsset) => {
                console.log('on add IMage', a)
                setImageAsset(a)
              }}
            />
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

      <Button title="done" onPress={submit} />
    </>
  )
}
