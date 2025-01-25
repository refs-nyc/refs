import { useState, useEffect } from 'react'
import { usePathname } from 'expo-router'
import {
  View,
  Pressable,
  Dimensions,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native'
import { Heading, XStack, YStack } from '@/ui'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { EditableHeader } from '../atoms/EditableHeader'
import { addToProfile } from '@/features/pocketbase'
import { Button } from '../buttons/Button'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useItemStore } from '@/features/pocketbase/stores/items'
import type { ImagePickerAsset } from 'expo-image-picker'
import { c, s } from '@/features/style'
import { CompleteRef, StagedRef, Item } from '@/features/pocketbase/stores/types'

const win = Dimensions.get('window')

export const RefForm = ({
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
  const [currentRefComment, setCurrentRefComment] = useState<string>()
  const [imageAsset, setImageAsset] = useState(r?.image || null)
  const [pinataSource, setPinataSource] = useState('')
  const [picking, setPicking] = useState(false)

  const pathname = usePathname()

  // Mandatory
  // Ref title
  // Ref image

  const updateRefImage = (image: string) => {
    setPinataSource(image)

    const u = { ...r, image }
    setCurrentRef(u)
  }

  const updateRefTitle = (title: string) => {
    const u = { ...r, title }
    setCurrentRef(u)
  }

  const updateRefUrl = (url: string) => {
    const u = { ...r, url }
    setCurrentRef(u)
  }

  const updateData = (d: { title: string; url: string; image: string }) => {
    updateRefTitle(d.title)
    updateRefImage(d.image)
    updateRefUrl(d.url)
    setImageAsset(d.image)
  }

  const submit = async (extraFields?: any) => {
    const data = {
      ...currentRef,
      image: pinataSource,
      backlog,
      ...extraFields,
    }

    try {
      const item = await addToProfile(data, !pathname.includes('onboarding'), {
        comment: currentRefComment,
        backlog,
      })
      onComplete(item)
    } catch (e) {
      console.error(e)
    } finally {
      console.log('Done')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior="height"
      style={{
        // paddingTop: s.$2,
        marginBottom: s.$4,
        flex: 1,
        alignItems: 'center',
        gap: s.$4,
      }}
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
        <EditableHeader
          onComplete={updateRefTitle}
          onDataChange={updateData}
          placeholder={placeholder}
          title={r?.title || placeholder}
          url={r?.url || ''}
        />
        {/* Notes */}
        <TextInput
          multiline={true}
          numberOfLines={4}
          placeholder="Add a caption for your profile"
          onChangeText={setCurrentRefComment}
          style={{
            backgroundColor: c.white,
            borderRadius: s.$075,
            width: '100%',
            padding: s.$1,
            minHeight: s.$12,
            // minHeight: 2000,
          }}
        />
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {currentRef.url === '' && (
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
          )}
          <Button
            title="Add Ref"
            variant="fluid"
            style={{ width: currentRef.url ? '100%' : '48%', minWidth: 0 }}
            disabled={pinataSource === 'none'}
            onPress={() => submit()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
