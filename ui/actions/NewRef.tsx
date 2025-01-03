import { useState, useEffect } from 'react'
import { usePathname } from 'expo-router'
import { View, Pressable, Dimensions, TextInput, ScrollView } from 'react-native'
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
  const [picking, setPicking] = useState(false)

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

  const submit = async (extraFields?: any) => {
    console.log('EXTRA FIELDS', extraFields)
    const data = {
      ...currentRef,
      image: pinataSource,
      backlog,
      ...extraFields,
    }

    console.log('DATA:', data)

    try {
      const item = await addToProfile(data, !pathname.includes('onboarding'))
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
    <YStack
      style={{
        // paddingTop: s.$2,
        marginBottom: s.$4,
        flex: 1,
        alignItems: 'center',
      }}
      gap={s.$4}
    >
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          gap: s.$2,
          paddingVertical: s.$2,
        }}
        style={{ flex: 1, width: '100%' }}
      >
        {imageAsset ? (
          <PinataImage
            asset={imageAsset}
            onSuccess={updateRefImage}
            onFail={() => console.error('Cant ul')}
          />
        ) : (
          <>
            {picking && (
              <Picker
                onSuccess={(a: ImagePickerAsset) => {
                  setImageAsset(a)
                }}
                onCancel={() => setPicking(false)}
              />
            )}
            <View
              style={{
                width: 200,
                height: 200,
              }}
            >
              <Pressable style={{ flex: 1 }} onPress={() => setPicking(true)}>
                <View
                  style={{
                    flex: 1,
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
            // minHeight: 2000,
          }}
        />
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'stretch',
          backgroundColor: 'green',
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
          bottom: 0,
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
          onPress={() => {
            console.log('ABOUT TO ADD A LIST')
            submit({ list: true })
          }}
        />
        <Button
          title="Add Ref"
          variant="fluid"
          style={{ width: '48%', minWidth: 0 }}
          disabled={pinataSource === 'none'}
          onPress={() => submit()}
        />
      </View>
    </YStack>
  )
}
