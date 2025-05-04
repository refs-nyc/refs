import { useState, useEffect } from 'react'
import { usePathname } from 'expo-router'
import { View, TouchableOpacity, Dimensions } from 'react-native'
import { BottomSheetScrollView, BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet'

import { Heading } from '@/ui/typo/Heading'
import { Picker } from '../inputs/Picker'
import { PinataImage } from '../images/PinataImage'
import { Image } from 'expo-image'
import { SimplePinataImage } from '../images/SimplePinataImage'
import { EditableHeader } from '../atoms/EditableHeader'
import { addToProfile } from '@/features/pocketbase'
import { Button } from '../buttons/Button'
import type { ImagePickerAsset } from 'expo-image-picker'
import { c, s } from '@/features/style'
import { StagedRef, Item, ExpandedItem } from '@/features/pocketbase/stores/types'

const win = Dimensions.get('window')

export const RefForm = ({
  r,
  placeholder = 'Add a title',
  onComplete,
  onCancel,
  backlog = false,
  pickerOpen = false,
  attach = true,
}: {
  r: StagedRef
  placeholder?: string
  onComplete: (i: ExpandedItem) => void
  onCancel: () => void
  pickerOpen?: boolean
  backlog?: boolean
  attach?: boolean
}) => {
  // Separate state for each field to prevent unnecessary re-renders
  const [title, setTitle] = useState<string>(r?.title || '')
  const [url, setUrl] = useState<string>(r?.url || '')
  const [comment, setComment] = useState<string>('')
  const [imageAsset, setImageAsset] = useState<ImagePickerAsset | null>(null)
  const [pinataSource, setPinataSource] = useState<string>('')
  const [picking, setPicking] = useState(pickerOpen)
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [createInProgress, setCreateInProgress] = useState(false)

  const pathname = usePathname()

  // Initialize state based on incoming ref
  useEffect(() => {
    console.log(r)
    if (r?.title) setTitle(r.title)
    if (r?.url) setUrl(r.url)

    // Initialize image state
    if (r?.image) {
      console.log('image found')
      console.log(r.image)
      if (typeof r.image === 'string') {
        setPinataSource(r.image)
      } else {
        setImageAsset(r.image)
      }
    }
  }, [r])

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
  }

  const handleImageSuccess = (imageUrl: string) => {
    setUploadInProgress(false)

    // Prefetch image to ensure it's in cache
    Image.prefetch(imageUrl)
      .then(() => {
        setPinataSource(imageUrl)
      })
      .catch((err) => {
        console.error('Failed to prefetch image:', err)
      })
  }

  const handleDataChange = (d: { title: string; url: string; image?: string | undefined }) => {
    setTitle(d.title)
    setUrl(d.url)
    if (d.image) {
      setPinataSource(d.image)
    }
  }

  const submit = async (extraFields?: any) => {
    console.log('extraFields')
    console.log(extraFields)
    const data = {
      ...r,
      title,
      url,
      image: pinataSource,
      backlog,
      ...extraFields,
    }

    try {
      setCreateInProgress(true)
      const item = await addToProfile(data, !pathname.includes('onboarding'), {
        comment,
        backlog,
        ...extraFields,
      })
      onComplete(item)
      setCreateInProgress(false)
      console.log('success')
    } catch (e) {
      console.error(e)
    } finally {
      console.log('Done')
    }
  }

  return (
    <View
      style={{ justifyContent: 'center', alignItems: 'center', gap: s.$2, marginVertical: s.$4 }}
    >
      <View style={{ width: 200, height: 200 }}>
        {imageAsset ? (
          <PinataImage
            asset={imageAsset}
            onReplace={() => setPicking(true)}
            onSuccess={handleImageSuccess}
            onFail={() => {
              console.error('Upload failed')
              setUploadInProgress(false)
            }}
          />
        ) : pinataSource ? (
          <TouchableOpacity
            style={{ flex: 1, width: 200, height: 200, borderRadius: s.$075, overflow: 'hidden' }}
            onLongPress={() => setPicking(true)}
          >
            <Image style={{ flex: 1 }} source={pinataSource} placeholder={pinataSource} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPicking(true)}>
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
          </TouchableOpacity>
        )}
      </View>

      {picking && (
        <Picker
          onSuccess={(a: ImagePickerAsset) => {
            setImageAsset(a)
            setPicking(false)
            setUploadInProgress(true)
          }}
          onCancel={() => setPicking(false)}
        />
      )}

      <EditableHeader
        onTitleChange={handleTitleChange}
        onDataChange={handleDataChange}
        placeholder={placeholder}
        title={title || placeholder}
        url={url || ''}
      />

      {/* Notes */}
      <TextInput
        multiline={true}
        numberOfLines={4}
        placeholder="Add a caption for your profile"
        placeholderTextColor={c.muted}
        onChangeText={setComment}
        style={{
          backgroundColor: c.white,
          borderRadius: s.$075,
          width: '100%',
          padding: s.$1,
          minHeight: s.$12,
        }}
      />

      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        {/* Lists can't have a url */}
        {!url && (
          <Button
            title="Create List"
            variant="outlineFluid"
            style={{ width: '48%', minWidth: 0 }}
            disabled={!title || uploadInProgress || createInProgress}
            onPress={() => {
              submit({ list: true })
            }}
          />
        )}
        <Button
          title="Add Ref"
          variant="fluid"
          style={{ width: url ? '100%' : '48%', minWidth: 0 }}
          disabled={!(pinataSource && title) || uploadInProgress || createInProgress}
          onPress={() => submit()}
        />
      </View>
    </View>
  )
}
