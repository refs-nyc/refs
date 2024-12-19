import { useState } from 'react'
import { usePathname } from 'expo-router'
import { View, Pressable, Dimensions } from 'react-native'
import { Heading, YStack } from '@/ui'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { EditableTitle } from '../atoms/EditableTitle'
import { createRefWithItem } from '@/features/canvas/stores'
import { Button } from '../buttons/Button'
import Ionicons from '@expo/vector-icons/Ionicons'
import type { ImagePickerAsset } from 'expo-image-picker'
import { c, s } from '@/features/style'

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
      <View
        style={{
          width: '100%',
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Pressable onPress={() => setPicking(true)}>
          <View
            style={{
              width: 200,
              height: 200,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: c.black,
              borderRadius: s.$075,
            }}
          >
            <Heading tag="h1light">+</Heading>
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
  onCancel,
  backlog = false,
  attach = true,
}: {
  r: StagedRef
  placeholder: string
  onComplete: (i: Item) => void
  onCancel: () => void
  backlog?: boolean
  attach: boolean
}) => {
  const [currentRef, setCurrentRef] = useState<StagedRef>({ ...r })
  const [imageAsset, setImageAsset] = useState(r?.image || null)
  const [pinataSource, setPinataSource] = useState('')

  const minHeight = win.height * 0.7

  const pathname = usePathname()

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
      const { item, ref } = await createRefWithItem(
        { ...currentRef, image: pinataSource, backlog },
        !pathname.includes('onboarding')
      )
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
      <Ionicons name="chevron-back" size={20} onPress={onCancel} />
      <View style={{ minHeight, justifyContent: 'start', paddingTop: s.$4 }}>
        <YStack gap={s.$3}>
          {imageAsset ? (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View
                style={{
                  width: 200,
                  height: 200,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 0,
                  borderRadius: s.$075,
                }}
              >
                <PinataImage
                  asset={imageAsset}
                  onSuccess={updateRefImage}
                  onFail={() => console.error('Cant ul')}
                />
              </View>
            </View>
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
      <Button
        style={{ position: 'absolute', bottom: s.$4, left: s.$08, width: '100%' }}
        title="done"
        disabled={pinataSource === 'none'}
        onPress={submit}
      />
    </>
  )
}
