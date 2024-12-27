import { useState, useEffect } from 'react'
import { usePathname } from 'expo-router'
import { View, Pressable, Dimensions, TextInput } from 'react-native'
import { Heading, XStack, YStack } from '@/ui'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { EditableTitle } from '../atoms/EditableTitle'
import { addToProfile } from '@/features/pocketbase'
import { Button } from '../buttons/Button'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useItemStore } from '@/features/pocketbase/stores/items'
import type { ImagePickerAsset } from 'expo-image-picker'
import { c, s } from '@/features/style'
import { CompleteRef, StagedRef, Item } from '@/features/pocketbase/stores/types'

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
  placeholder?: string
  onComplete: (i: Item) => void
  onCancel: () => void
  backlog?: boolean
  attach?: boolean
}) => {
  const [currentRef, setCurrentRef] = useState<StagedRef>({ ...r })
  const [imageAsset, setImageAsset] = useState(r?.image || null)
  const [pinataSource, setPinataSource] = useState('')
  const [text, setTextState] = useState('')
  const [addItems, setAddItems] = useState(false)

  const { push } = useItemStore()

  const minHeight = win.height * 0.7

  const pathname = usePathname()

  const updateRefImage = (image: string) => {
    setPinataSource(image)

    const u = { ...r, image }
    setCurrentRef(u)
  }

  const updateRefTitle = (title: string) => {
    const u = { ...r, title }
    setCurrentRef(u)
  }

  const submit = async (extraFields?: Item) => {
    try {
      const item = await addToProfile(
        {
          ...currentRef,
          image: pinataSource,
          backlog,
          ...extraFields,
        },
        !pathname.includes('onboarding') // don't attach to profile if there is no profile
      )
      onComplete(item)
    } catch (e) {
      console.error(e)
    } finally {
      console.log('Done')
    }
  }

  useEffect(() => {
    setCurrentRef({ ...currentRef, text })
  }, [text])

  return (
    <>
      <Ionicons name="chevron-back" size={20} onPress={onCancel} />
      <View style={{ minHeight, justifyContent: 'flex-start', paddingTop: s.$4 }}>
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
                return a
              }}
            />
          )}
          <EditableTitle
            onComplete={updateRefTitle}
            placeholder={placeholder}
            title={r?.title || placeholder}
          />
          {/* Notes */}
          <TextInput
            multiline={true}
            numberOfLines={4}
            placeholder="Care to comment?"
            onChangeText={setTextState}
            style={{
              backgroundColor: c.white,
              borderRadius: s.$075,
              width: '100%',
              padding: s.$1,
              minHeight: s.$12,
            }}
          />
        </YStack>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'stretch',
          gap: s.$1,
        }}
      >
        {/* <Button
          style={{ minWidth: 0, width: (win.width - s.$2 * 2 - s.$1) / 2 }}
          variant="outline"
          title="Start a list"
        /> */}
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: s.$3,
          left: s.$08,
          minWidth: 0,
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Button
          title="Create List"
          variant="outlineFluid"
          style={{ width: '48%', minWidth: 0 }}
          disabled={pinataSource === 'none'}
          onPress={() => submit({ list: true })}
        />
        <Button
          title="Add Ref"
          variant="fluid"
          style={{ width: '48%', minWidth: 0 }}
          disabled={pinataSource === 'none'}
          onPress={() => submit()}
        />
      </View>
    </>
  )
}
